# Bulk Import Feature - Documentation

## Overview

The Bulk Import feature allows teachers to add multiple students at once by uploading a CSV (Comma-Separated Values) file. This saves time compared to adding students one by one and automatically sends invitations to all new students.

## How to Use

### Step 1: Prepare Your CSV File

The CSV file should have the following format:

```
Navn,E-post,Fag
Ole Nordmann,ole@example.com,Matematikk
Maria Jensen,maria@example.com,Engelsk
Per Andersen,per@example.com,Norsk
```

**Columns needed:**
- **Navn** (Name) - Student's full name - REQUIRED
- **E-post** (Email) - Student's email address - REQUIRED
- **Fag** (Subject) - The subject/course name - OPTIONAL

**Rules:**
- The header row (first row) is optional and will be automatically skipped if it contains "Navn" or "E-post"
- Email addresses must be valid (contain @) and unique for your account
- Names can include spaces and special characters
- The subject field can be left empty

### Step 2: Download the Template

In the application, click "Last ned mal-fil" to download a ready-made CSV template you can copy and modify.

### Step 3: Upload the File

1. Go to "Elevoversikt" (Student Overview) in your dashboard
2. Click "Last opp CSV-fil" button
3. Select your CSV file from your computer

### Step 4: Review and Import

1. The system will show you how many students are in the file
2. Click "Start import"
3. A progress bar shows the import status
4. After completion, you'll see a detailed summary

## Import Summary

After the import finishes, you'll see:

- **Total**: Total number of students from the file
- **Suksess** (Success): Number of students successfully added
- **Feil** (Errors): Number of students with issues

Each result shows:
- Student name and email
- Success or error message
- Why it might have failed (if applicable)

## Common Issues and Solutions

### Issue: "E-post must be gyldig" (Email must be valid)

**Cause:** The email format is incorrect or missing @

**Solution:** Make sure each email is in the format `name@domain.com`

### Issue: "Elev finnes allerede" (Student already exists)

**Cause:** This student is already registered under your account with the same email

**Solution:** The system will reuse the existing student and extend their invitation by 7 days

### Issue: "Ingen lærer logget inn" (No teacher logged in)

**Cause:** Your session expired or there's an authentication issue

**Solution:** Log out and log back in, then try the import again

### Issue: "Kunne ikke sende e-post" (Could not send email)

**Cause:** There's an issue with the email sending service

**Solution:** The student is still created in the system, but they won't receive an invitation email. You may need to manually send them a link later.

## CSV File Format Examples

### Minimal Format (Required columns only)
```
Navn,E-post
Ole Nordmann,ole@example.com
Maria Jensen,maria@example.com
```

### Full Format (With subject)
```
Navn,E-post,Fag
Ole Nordmann,ole@example.com,Matematikk
Maria Jensen,maria@example.com,Engelsk
Per Andersen,per@example.com,Norsk
```

### Alternative Format (Without header)
```
Ole Nordmann,ole@example.com,Matematikk
Maria Jensen,maria@example.com,Engelsk
Per Andersen,per@example.com,Norsk
```

## Advanced Tips

### Creating a CSV from Excel

1. Open Excel and enter your data in columns:
   - Column A: Names
   - Column B: Emails  
   - Column C: Subjects (optional)

2. Add a header row with: `Navn,E-post,Fag`

3. Go to **File → Save As**

4. Choose **CSV (Comma delimited)** format

5. Save the file with a `.csv` extension

### Creating a CSV from Google Sheets

1. Open Google Sheets with your student data

2. Go to **File → Download → Comma-separated values (.csv)**

3. Use the downloaded CSV file

### Creating a CSV from Numbers (Mac)

1. Open your spreadsheet in Numbers

2. Go to **File → Export → CSV**

3. Save the file

## What Happens After Import

For each student in your CSV file:

1. The system checks if they already exist in your student list
2. If new, a student record is created
3. A unique invitation token is generated (7 days validity)
4. An invitation email is sent to their email address
5. The student can click the link in the email to activate their account

## Frequently Asked Questions

**Q: Can I import students from other teachers' lists?**
A: No. Students are always linked to your account based on their email address. Each teacher has their own separate student list.

**Q: What happens if a student is imported twice?**
A: If the email exists in your list, the system will reuse their profile instead of creating a duplicate.

**Q: Can students be imported without sending emails?**
A: Currently, emails are sent automatically. You can ask support if you need a way to skip email sending.

**Q: How many students can I import at once?**
A: There's no hard limit, but importing very large files (500+ students) may take a few minutes.

**Q: What if a student doesn't receive their invitation email?**
A: Check their spam folder. You can also manually resend invitations from the student overview or provide them with their unique invitation link manually.

**Q: Can I upload a file with duplicate emails?**
A: Yes, but duplicates within the file will be treated as separate import attempts for the same email. Only the first one will succeed.

**Q: What file formats are supported?**
A: Only `.csv` files are supported. Convert Excel, Google Sheets, or other formats to CSV first.

## Privacy and Security

- Email addresses are stored securely and only used for sending invitation emails
- Invitation tokens are unique and expire after 7 days
- Students must complete their profile before accessing the system
- All data is encrypted in transit and at rest

## Performance Considerations

- The import is processed sequentially to prevent rate limiting
- Each student takes ~200-500ms to process
- Importing 50 students typically takes 10-25 seconds
- Importing 100 students typically takes 20-50 seconds

## Support

If you encounter issues with bulk import:

1. Check that your CSV file is properly formatted
2. Ensure all emails are unique within your imported file
3. Try the import again with a smaller batch
4. Check the detailed error messages in the import summary
5. Contact support if the issue persists

## File Size Limits

- Maximum file size: 10 MB
- Recommended: Keep files under 1000 students for best performance
- If you have more students, split into multiple files and import separately

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Status:** Active