# Bulk Import Quick Reference

## 5-Minute Setup

### 1. Create Your CSV File

Save this as `students.csv`:
```
Navn,E-post,Fag
Student Name,email@example.com,Subject Name
Ole Nordmann,ole@example.com,Matematikk
Maria Jensen,maria@example.com,Engelsk
```

### 2. Upload in App

1. Dashboard → **Elevoversikt** (Student Overview)
2. Click **"Last opp CSV-fil"** button
3. Select your `.csv` file
4. Click **"Start import"** 
5. Done! Invitations sent automatically

## CSV Format Checklist

✅ First row contains: `Navn,E-post,Fag`  
✅ One student per line  
✅ Email addresses are valid (name@domain.com)  
✅ File is saved as `.csv` format  
✅ No extra spaces or commas  

## Column Requirements

| Column | Required | Example |
|--------|----------|---------|
| Navn (Name) | ✅ Yes | Ole Nordmann |
| E-post (Email) | ✅ Yes | ole@example.com |
| Fag (Subject) | ❌ Optional | Matematikk |

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open bulk import | Dashboard → Elevoversikt → Last opp CSV-fil |
| Download template | Click "Last ned mal-fil" button |
| Cancel import | Press Escape or click X |

## What Gets Done Automatically

✔️ Creates student record  
✔️ Generates invitation token (7-day validity)  
✔️ Sends invitation email  
✔️ Prevents duplicate emails  
✔️ Shows progress bar  
✔️ Displays summary report  

## Troubleshooting

| Problem | Solution |
|---------|----------|
| File not accepted | Make sure it's `.csv` format, not xlsx or txt |
| Email format rejected | Use format: `name@domain.com` |
| Import fails | Check that all required columns are present |
| No email sent | Check student's spam folder |
| Same student twice | System will reuse existing profile |

## Import Indicators

- 🟢 **Green checkmark** = Success
- 🔴 **Red X** = Failed (see error message)
- ⏳ **Progress bar** = Import in progress
- 📊 **Summary stats** = Results overview

## Email Template (What students receive)

Subject: Du er invitert til elevportalen  
Body: Includes personalized invitation link and registration instructions

## Common Mistakes to Avoid

❌ Using `.xlsx` or `.xls` instead of `.csv`  
❌ Forgetting the header row  
❌ Extra spaces in email addresses  
❌ Duplicate emails in the same file  
❌ Missing the `@` symbol in emails  

---

**Pro Tip:** Use the provided template file as your starting point to avoid formatting issues!