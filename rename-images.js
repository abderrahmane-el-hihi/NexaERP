const fs = require('fs');
const path = require('path');
const dir = 'public/images';

const files = fs.readdirSync(dir);

for (const file of files) {
  if (file.startsWith('company_about_')) fs.renameSync(path.join(dir, file), path.join(dir, 'company_about.jpg'));
  if (file.startsWith('company_careers_')) fs.renameSync(path.join(dir, file), path.join(dir, 'company_careers.jpg'));
  if (file.startsWith('company_contact_')) fs.renameSync(path.join(dir, file), path.join(dir, 'company_contact.jpg'));
  if (file.startsWith('company_partners_')) fs.renameSync(path.join(dir, file), path.join(dir, 'company_partners.jpg'));
  if (file.startsWith('legal_privacy_')) fs.renameSync(path.join(dir, file), path.join(dir, 'legal_privacy.jpg'));
}
