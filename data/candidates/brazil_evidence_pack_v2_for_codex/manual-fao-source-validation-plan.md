# Manual FAO source validation plan

## Purpose

Validate manually downloaded official FAO/FAOSTAT/FAODATA Explorer Brazil source files before any value extraction. This plan is a gate, not a parser.

## Required validations

Codex must validate all of the following before asking ChatGPT whether extraction may proceed:

- file exists;
- checksum;
- byte size;
- file format readable;
- source is official FAO/FAOSTAT/FAODATA;
- country filter is Brazil;
- QCL rows use Producing Animals/Slaughtered only;
- QCL rows exclude offal/fat/aggregate/non-slaughter items;
- RP rows use Insecticides + Agricultural Use only;
- units are recorded;
- reference periods are recorded;
- no row is treated as pain/suffering estimate;
- output remains candidate-only;
- no country promotion;
- no production release artifact regeneration.

## Required validation outputs

When the user supplies files, Codex should create a validation report containing:

- manifest row used;
- file path;
- checksum algorithm and checksum;
- byte size;
- detected file format;
- parse/readability result;
- visible source/domain metadata;
- visible country/area filters;
- visible element/item filters;
- visible units;
- visible years/reference periods;
- terms/license/attribution/caveat text found in file or UI metadata;
- rejected rows and reasons;
- candidate rows count by file;
- explicit statement that no extraction into production artifacts occurred.

## Non-goals

Do not extract production measurements. Do not promote Brazil. Do not regenerate release artifacts. Do not infer missing values. Do not use OWID or Fishcount. Do not treat any row as a direct pain/suffering measurement.
