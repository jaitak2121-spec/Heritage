import { expect, test } from '@playwright/test';

const curatorPassword = 'e2e-curator-password';

const buildPdf = (text) => {
  const safeText = text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  const stream = `BT\n/F1 18 Tf\n72 720 Td\n(${safeText}) Tj\nET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body);
};

const signIn = async (page) => {
  await page.goto('/curator/login');
  await page.getByLabel('Curator password').fill(curatorPassword);
  await page.getByRole('button', { name: 'Enter curator workspace' }).click();
  await expect(page).toHaveURL(/\/digitize$/);
  await expect(page.getByRole('heading', { name: 'Digitize Archival Records' })).toBeVisible();
};


test('public full-text search opens a document and survives direct refresh', async ({ page }) => {
  await page.goto('/archive');
  await expect(page.getByRole('heading', { name: 'Cultural Heritage Archive' })).toBeVisible();
  await page.getByPlaceholder('Search monuments, eras...').fill('shadow analysis confirms');
  await expect(page.getByRole('heading', { name: 'Digitized documents' })).toBeVisible();
  await page.getByRole('link', { name: /Astronomical & Mechanical Analysis/ }).click();
  await expect(page).toHaveURL(/\/documents\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Astronomical & Mechanical Analysis of Konark Wheels' })).toBeVisible();
  await expect(page.getByText(/shadow analysis confirms accurate division/i)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Astronomical & Mechanical Analysis of Konark Wheels' })).toBeVisible();
});


test('digitization remains protected and logout removes curator access', async ({ page }) => {
  await page.goto('/digitize');
  await expect(page.getByRole('heading', { name: 'Curator access required' })).toBeVisible();
  await page.getByRole('link', { name: 'Sign in as curator' }).click();
  await page.getByLabel('Curator password').fill(curatorPassword);
  await page.getByRole('button', { name: 'Enter curator workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Digitize Archival Records' })).toBeVisible();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('heading', { name: 'Curator access required' })).toBeVisible();
});


test('background upload reaches review and can be approved and deleted', async ({ page }) => {
  await signIn(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'e2e_background_record.pdf',
    mimeType: 'application/pdf',
    buffer: buildPdf('HERITAGELENS E2E BACKGROUND EXTRACTION'),
  });
  await page.getByRole('button', { name: 'Extract & Digitize Record' }).click();
  await expect(page.getByRole('heading', { name: 'Review Extracted Text & Metadata' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('textarea')).toHaveValue(/HERITAGELENS E2E BACKGROUND EXTRACTION/);
  await page.getByRole('button', { name: 'Save to Heritage Archive' }).click();
  await expect(page.getByRole('heading', { name: 'Document Cataloged Successfully' })).toBeVisible();

  const row = page.locator('tbody tr').filter({ hasText: 'e2e background record' });
  await expect(row).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByTitle('Delete document').click();
  await expect(row).toHaveCount(0);
});
