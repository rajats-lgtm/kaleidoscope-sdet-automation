import { expect, test } from '@playwright/test';
import { ApplicationPage1 } from '../pages/ApplicationPage1';
import { ApplicationPage2, MINIMUM_ACTIVITIES } from '../pages/ApplicationPage2';
import { ApplicationPage3 } from '../pages/ApplicationPage3';
import { ApplicationPage4 } from '../pages/ApplicationPage4';
import { ConfirmationPage } from '../pages/ConfirmationPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ReviewPage } from '../pages/ReviewPage';
import { ScholarshipLandingPage } from '../pages/ScholarshipLandingPage';
import { buildApplicant } from '../testdata/applicant.data';
import { attachScreenshot } from '../utils/evidence.utils';
import { createLogger } from '../utils/logger';

const log = createLogger('scholarship-spec');

test.describe('Kaleidoscope – SDET scholarship application', () => {
  test('landing page presents the program with an entry point @smoke', async ({ page }) => {
    const landing = new ScholarshipLandingPage(page, buildApplicant());
    await landing.open();
    await landing.expectLoaded();
    log.info(`Program title: ${await landing.programTitle()}`);
  });

  test('new applicant can register, complete, review and submit the application @e2e', async ({ page }, testInfo) => {
    const applicant = buildApplicant();
    log.info(`Run ${applicant.runId} – applicant ${applicant.account.email}`);

    const landing = new ScholarshipLandingPage(page, applicant);
    const register = new RegisterPage(page, applicant);
    const page1 = new ApplicationPage1(page, applicant);
    const page2 = new ApplicationPage2(page, applicant);
    const page3 = new ApplicationPage3(page, applicant);
    const page4 = new ApplicationPage4(page, applicant);
    const review = new ReviewPage(page, applicant);
    const confirmation = new ConfirmationPage(page, applicant);

    await test.step('Open the scholarship landing page', async () => {
      await landing.open();
      await landing.expectLoaded();
    });

    await test.step('Register a new user', async () => {
      await landing.startApplication();
      await register.register();
      await attachScreenshot(page, testInfo, '01-registered');
    });

    await test.step('Begin a new application for the program', async () => {
      await page1.beginApplication();
    });

    await test.step('Page 1 – fill out all required fields', async () => {
      await page1.fillRequiredFields();
      await attachScreenshot(page, testInfo, '02-page1-filled');
      await page1.continueToNextPage();
    });

    await test.step(`Page 2 – at least ${MINIMUM_ACTIVITIES} activities are required`, async () => {
      await page2.expectMinimumActivitiesValidation();
      await attachScreenshot(page, testInfo, '03-page2-validation');
    });

    await test.step('Page 2 – provide 4 activities and continue', async () => {
      await page2.provideFourActivities();
      await attachScreenshot(page, testInfo, '04-page2-four-activities');
      await page2.continueToNextPage();
    });

    await test.step('Page 3 – fill the form and upload the school transcript', async () => {
      await page3.fillForm3();
      await page3.uploadTranscript();
      await attachScreenshot(page, testInfo, '05-page3-transcript');
      await page3.continueToNextPage();
    });

    await test.step('Page 4 – every essay type reveals its essay box', async () => {
      await page4.expectEachOptionRevealsEssayBox();
      await attachScreenshot(page, testInfo, '06-page4-options-verified');
    });

    await test.step('Page 4 – select only Animals and School and write both essays', async () => {
      await page4.selectOnly(['Animals', 'School']);
      await page4.writeEssays(['Animals', 'School']);
      await attachScreenshot(page, testInfo, '07-page4-essays');
      await page4.continueToReview();
    });

    await test.step('Review – pages and answers are shown as answered', async () => {
      await review.expectLoaded();
      review.captureApplicationUrl();
      await review.expectPagesAndAnswersShownAsAnswered(['animals', 'school']);
      await attachScreenshot(page, testInfo, '08-review');
    });

    await test.step('Submit the application', async () => {
      await review.submit();
      await confirmation.expectSubmitted();
      await attachScreenshot(page, testInfo, '09-submitted');
    });

    await test.step('Return to the captured URL – editing is not allowed', async () => {
      expect(review.applicationUrl).toMatch(/^https?:\/\//);
      await confirmation.expectEditingNotAllowed(review.applicationUrl);
      await attachScreenshot(page, testInfo, '10-read-only');
    });
  });
});
