# Kaleidoscope SDET Automation

End-to-end test automation for the **Kaleidoscope scholarship application** flow, built with
**Playwright + TypeScript** and a strict **Page Object Model**.

Program under test: <https://apply.mykaleidoscope.com/program/sdet-test-scholarship>

---

## What is covered

| # | Requirement | Where it lives |
|---|-------------|----------------|
| 1 | Register a new user (unique email per run) | `RegisterPage`, `utils/faker.utils.ts` |
| 2 | Begin a new application for the program | `ScholarshipLandingPage`, `ApplicationPage1.beginApplication()` |
| 3 | **Page 1** – fill all required fields | `ApplicationPage1.fillRequiredFields()` |
| 4 | **Page 2** – validation: at least 2 activities required | `ApplicationPage2.expectMinimumActivitiesValidation()` |
| 5 | **Page 2** – provide 4 activities | `ApplicationPage2.provideFourActivities()` |
| 6 | **Page 3** – fill the form | `ApplicationPage3.fillForm3()` |
| 7 | **Page 3** – upload *My School Transcript.pdf* | `ApplicationPage3.uploadTranscript()` |
| 8 | **Page 4** – Cars / Animals / School / Other each reveal an essay box | `ApplicationPage4.expectEachOptionRevealsEssayBox()` |
| 9 | **Page 4** – select only Animals + School, answer both essays | `ApplicationPage4.selectOnly()`, `writeEssays()` |
| 10 | **Review** – every page/answer shown as answered; unselected essays absent | `ReviewPage.expectPagesAndAnswersShownAsAnswered()` |
| 11 | Capture the application URL before submitting | `ReviewPage.captureApplicationUrl()` |
| 12 | Submit and confirm | `ReviewPage.submit()`, `ConfirmationPage.expectSubmitted()` |
| 13 | Return to captured URL – editing must not be allowed | `ConfirmationPage.expectEditingNotAllowed()` |

Two tests are provided: a fast `@smoke` landing-page check and the full `@e2e` journey
(10 named `test.step`s, each with a screenshot attached to the HTML report).

---

## Project structure

```
kaleidoscope-sdet-automation/
├── README.md
├── package.json
├── playwright.config.ts        # retries, traces, screenshots, video, HTML + JUnit reports
├── tsconfig.json
├── .env.example
├── .github/workflows/playwright.yml
├── fixtures/
│   └── My School Transcript.pdf
├── testdata/
│   └── applicant.data.ts       # unique applicant: account, profile, 4 activities, essays
├── pages/                      # Page Object Model – no assertions-by-selector in tests
│   ├── BasePage.ts             # stepping, validation reading, shared locators
│   ├── ScholarshipLandingPage.ts
│   ├── RegisterPage.ts
│   ├── ApplicationPage1.ts     # required fields
│   ├── ApplicationPage2.ts     # activities (2 required, then 4)
│   ├── ApplicationPage3.ts     # form + transcript upload
│   ├── ApplicationPage4.ts     # essay-type checkboxes + essay boxes
│   ├── ReviewPage.ts
│   └── ConfirmationPage.ts
├── tests/
│   └── scholarship-application.spec.ts
├── utils/
│   ├── logger.ts               # levelled, timestamped, coloured logging
│   ├── wait.utils.ts           # retry, pollUntil, page-settled helpers
│   ├── faker.utils.ts          # unique user / email / password per run
│   ├── file.utils.ts           # fixture resolution with fail-fast checks
│   ├── assertion.utils.ts      # text / URL / visibility assertions
│   ├── form.utils.ts           # label-driven form filler (inputs, selects, radios, rich text)
│   └── evidence.utils.ts       # screenshot attachments for the report
└── reports/                    # gitignored: HTML report, JUnit, traces, videos
```

---

## Setup

Requires **Node.js 18.18+**.

```bash
cd kaleidoscope-sdet-automation
npm install
npx playwright install chromium     # add firefox webkit for cross-browser runs
cp .env.example .env                # optional
```

## Running

| Command | Purpose |
|---------|---------|
| `npm test` | All tests, all browsers |
| `npm run test:chromium` | Chromium only (fastest) |
| `npm run test:headed` | Watch the browser |
| `npm run test:ui` | Playwright UI mode |
| `npm run test:debug` | Step-through debugger |
| `npm run test:smoke` | `@smoke` tests only |
| `npm run test:e2e` | Full application journey only |
| `npm run report` | Open the HTML report |
| `npm run typecheck` | TypeScript validation |

## Configuration (`.env`)

| Variable | Default | Notes |
|----------|---------|-------|
| `BASE_URL` | the SDET program URL | Program under test |
| `HEADLESS` | `true` | `false` to watch runs |
| `SLOW_MO` | `0` | ms delay between actions |
| `LOG_LEVEL` | `info` | `debug` shows every filled field |
| `TEST_EMAIL_DOMAIN` | `example.com` | Domain for generated emails |
| `TEST_EMAIL_BASE` | – | e.g. `qa@gmail.com` → `qa+<unique>@gmail.com` |

---

## Design notes

- **Unique user per run** – timestamp + random token in email, password and activity names, so runs never collide and repeat runs are safe.
- **Resilient locators** – role/label based, never positional CSS chains. Each page object declares its locators at the top, so a markup change is a one-line fix.
- **Label-driven form filler** – `FormFiller` reads each field's accessible label and fills native inputs, selects, radios, checkboxes, ARIA comboboxes and rich-text editors from the applicant profile. Page 1 targets only fields flagged as required.
- **Deterministic waits** – no fixed sleeps for synchronisation. Stepping the wizard polls for a real change in URL/heading/field-count and surfaces any visible validation text if it does not move.
- **Strong negative checks** – the minimum-activity rule, the essay boxes disappearing when unticked, unselected essays being absent on review, and the absence of Edit/Submit/editable fields after submission.
- **Evidence** – trace on first retry, screenshots and video on failure, and a screenshot attached for every step.
- **CI ready** – GitHub Actions workflow included; one retry locally, two on CI.

## Troubleshooting

- **Email verification / blocked domain** – set `TEST_EMAIL_BASE` to a real inbox using plus-addressing.
- **A step cannot find a control** – run `LOG_LEVEL=debug npm run test:headed`, then adjust the locators at the top of the relevant page object.
- **Open a failed trace** – `npx playwright show-trace reports/artifacts/<test>/trace.zip`.

---

## Time spent

Measured from file timestamps while building the framework.

| Phase | Time |
|-------|------|
| Reading the brief and inspecting the package | ~2 min |
| Project scaffolding (package, tsconfig, Playwright config, CI, env) | ~1 min |
| Utilities and test data | ~1 min |
| Page objects and test spec | ~2 min |
| Type-check pass, README and packaging | ~1 min |
| **Total** | **≈ 7 minutes** |
