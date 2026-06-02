# AI test fixtures (PDFs)

Put PDF fixtures in this folder. They are **not** read directly by the Workers test runtime.
Instead, upload them to R2 and run live AI tests against R2 objects.

## Upload

```bash
pnpm ai:fixtures:upload
```

This uploads `*.pdf` files in this folder to the R2 bucket `typeed-forms-test-fixtures` under `documents/<filename>.pdf`.

## Run live AI tests

```bash
pnpm test:ai
```

