#!/usr/bin/env python3
"""One-time integration helper for the PainMap country-data branch.

The helper is committed only as temporary bootstrap scaffolding. It merges the
current main branch, resolves the small known set of generated/integration-file
conflicts in favor of main, restores PainMap's candidate-data commands, and
creates the merge commit. The parent workflow then refreshes data, validates the
entire site, removes this helper, and pushes the final result.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ALLOWED_CONFLICTS = {
    "data/index.html",
    "package.json",
    "data/country-gap-ledger.json",
    "data/source-snapshots.json",
    "latest/manifest.json",
}
TEMPORARY_MERGE_WORKFLOW = ROOT / ".github" / "workflows" / "codex-merge-current-main.yml"


def run(*args: str, check: bool = True, capture: bool = False) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        list(args),
        cwd=ROOT,
        text=True,
        capture_output=capture,
        check=False,
    )
    if check and result.returncode != 0:
        if result.stdout:
            print(result.stdout, file=sys.stderr)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        raise SystemExit(result.returncode)
    return result


def git_lines(*args: str) -> list[str]:
    result = run("git", *args, capture=True)
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def update_package() -> None:
    path = ROOT / "package.json"
    package = json.loads(path.read_text(encoding="utf-8"))
    scripts = package.setdefault("scripts", {})

    # Preserve main's brand-aware build:data pipeline. Add only the reviewed
    # candidate-data hooks and make offline candidate validation part of check.
    scripts["candidate:data:refresh"] = (
        "python3 scripts/build-source-backed-country-supplement.py --refresh"
    )
    scripts["candidate:data:check"] = (
        "python3 scripts/build-source-backed-country-supplement.py --check"
    )
    check_command = str(scripts.get("check") or "")
    if "candidate:data:check" not in check_command:
        marker = "npm run build:data"
        if marker not in check_command:
            raise SystemExit("package.json check command no longer contains npm run build:data")
        check_command = check_command.replace(
            marker,
            f"{marker} && npm run candidate:data:check",
            1,
        )
    scripts["check"] = check_command
    path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")
    run("git", "add", "package.json")


def main() -> int:
    run("git", "config", "user.name", "github-actions[bot]")
    run(
        "git",
        "config",
        "user.email",
        "41898282+github-actions[bot]@users.noreply.github.com",
    )

    # The workflow materializes files that must be byte-identical to the current
    # branch before this point. Refuse to merge over any unexpected local edits.
    dirty = git_lines("status", "--porcelain")
    if dirty:
        print("Unexpected pre-merge working-tree changes:", file=sys.stderr)
        print("\n".join(dirty), file=sys.stderr)
        return 1

    run("git", "fetch", "origin", "main")
    merge = run(
        "git",
        "merge",
        "--no-commit",
        "--no-ff",
        "origin/main",
        check=False,
        capture=True,
    )

    merge_head = ROOT / ".git" / "MERGE_HEAD"
    if merge.returncode != 0 and not merge_head.exists():
        if merge.stdout:
            print(merge.stdout, file=sys.stderr)
        if merge.stderr:
            print(merge.stderr, file=sys.stderr)
        return merge.returncode

    conflicts = set(git_lines("diff", "--name-only", "--diff-filter=U"))
    unexpected = sorted(conflicts - ALLOWED_CONFLICTS)
    if unexpected:
        print("Unexpected merge conflicts:", file=sys.stderr)
        print("\n".join(unexpected), file=sys.stderr)
        return 1

    for path in sorted(conflicts):
        run("git", "checkout", "--theirs", "--", path)
        run("git", "add", path)

    update_package()

    if TEMPORARY_MERGE_WORKFLOW.exists():
        TEMPORARY_MERGE_WORKFLOW.unlink()
        run("git", "add", "-u", str(TEMPORARY_MERGE_WORKFLOW.relative_to(ROOT)))

    remaining = git_lines("diff", "--name-only", "--diff-filter=U")
    if remaining:
        print("Unresolved merge paths remain:", file=sys.stderr)
        print("\n".join(remaining), file=sys.stderr)
        return 1

    if merge_head.exists():
        run("git", "commit", "-m", "Merge current main into PainMap data branch")
    else:
        print("Current main is already an ancestor; no merge commit was needed.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
