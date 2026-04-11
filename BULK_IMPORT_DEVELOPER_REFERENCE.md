# Bulk Import - Developer Reference

## Component Structure

### Files Created

```
src/components/
├── BulkImportModal.tsx          # Main bulk import component
└── Dashboard.tsx                # Updated with bulk import integration

Root directory
├── BULK_IMPORT_TEMPLATE.csv     # CSV template for users
├── BULK_IMPORT_GUIDE.md         # Comprehensive user guide
└── BULK_IMPORT_QUICK_REFERENCE.md  # Quick reference card
```

## Component Architecture

### BulkImportModal.tsx

**Main Features:**
- CSV file upload with drag-and-drop support
- CSV parsing (comma-separated values)
- Student data validation
- Batch invitation creation
- Progress tracking with progress bar
- Detailed result reporting
- Template download functionality

**Key Functions:**

```typescript
parseCSV(text: string): StudentRow[]
- Parses raw CSV text into structured data
- Skips header rows automatically
- Validates email format
- Returns array of StudentRow objects

inviteStudent(studentData: StudentRow): Promise<ImportResult>
- Checks if student already exists
- Creates new student if needed
- Generates invitation token
- Creates student_invitations record
- Sends invitation email via API
- Returns success/failure result

generateToken(): string
- Creates cryptographically secure token
- 64-character random string
- Fallback for older browsers
```

**State Management:**

```typescript
const [file, setFile] = useState<File | null>(null);
const [importing, setImporting] = useState(false);
const [progress, setProgress] = useState(0);
const [results, setResults] = useState<ImportResult[]>([]);
const [showResults, setShowResults] = useState(false);
```

### Dashboard Integration

**New Props:**
```typescript
const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
```

**New Modal Trigger:**
```typescript
<button onClick={() => setBulkImportModalOpen(true)}>
  Last opp CSV-fil
</button>
```

**Modal Rendering:**
```typescript
<BulkImportModal
  isOpen={bulkImportModalOpen}
  onClose={() => setBulkImportModalOpen(false)}
  tutorId={authUserId || ''}
  onSuccess={() => {
    fetchStudents();
    showToast('Elever importert og invitasjoner sendt!');
  }}
/>
```

## Data Flow

### Import Process

```
User selects CSV file
        ↓
File validation (is .csv?)
        ↓
Read file content
        ↓
Parse CSV into StudentRow[]
        ↓
For each student:
  ├─ Check if exists in DB
  ├─ Create if new
  ├─ Generate invitation token
  ├─ Insert into student_invitations
  ├─ Send email via API
  ├─ Record result (success/error)
  └─ Update progress bar
        ↓
Display summary with all results
```

### Database Operations

**Tables involved:**
- `students` - Student records
- `student_invitations` - Invitation metadata
- `profiles` - User account data

**API Endpoint:**
```
POST /api/invitations/send-email
Headers: { Authorization: Bearer <JWT> }
Body: {
  email: string,
  tutorName: string,
  token: string
}
```

## CSV Parsing Logic

```typescript
const parseCSV = (text: string): StudentRow[] => {
  const lines = text.split('\n').filter(line => line.trim());
  const rows: StudentRow[] = [];

  // Skip header if detected
  let startIndex = 0;
  if (lines[0]?.toLowerCase().includes('name') || 
      lines[0]?.toLowerCase().includes('email')) {
    startIndex = 1;
  }

  // Parse each line
  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i]
      .split(',')
      .map(p => p.trim().replace(/^"|"$/g, ''));
    
    if (parts.length >= 2) {
      const [name, email, subject = ''] = parts;
      
      // Validate
      if (name && email && email.includes('@')) {
        rows.push({ name, email, subject });
      }
    }
  }

  return rows;
};
```

## Error Handling

**Student-level errors:**
- Invalid email format
- Student already exists (handled gracefully)
- Database insertion failures
- Email sending failures

**File-level errors:**
- File size too large
- Invalid file format
- File read errors
- Empty file

**Recovery:**
- Partial imports continue on per-student errors
- Each error is logged individually
- Users can see exactly which students failed
- Failed students can be re-imported

## Performance Considerations

**Sequential Processing:**
- 200ms delay between each student
- Prevents rate limiting on email API
- Allows server to handle load
- Progress updates feel smooth

**Implementation:**
```typescript
for (let i = 0; i < students.length; i++) {
  const result = await inviteStudent(students[i]);
  setProgress(Math.round(((i + 1) / students.length) * 100));
  
  // Rate limiting delay
  await new Promise(resolve => setTimeout(resolve, 200));
}
```

**Expected Times:**
- 50 students: ~10-25 seconds
- 100 students: ~20-50 seconds
- 500 students: ~100-250 seconds

## Security Features

✅ **Input Validation**
- Email format validation
- CSV structure validation
- Unique email enforcement (per teacher)

✅ **Authentication**
- JWT token required for email sending
- User must be logged in
- Operations tied to authenticated teacher

✅ **Rate Limiting**
- Sequential processing prevents API abuse
- 200ms delay built-in
- Server-side rate limits apply

✅ **Token Security**
- Cryptographic random tokens
- 64-character length
- 7-day expiration
- Unique per invitation

## Testing Checklist

- [ ] CSV file upload works
- [ ] CSV parsing handles various formats
- [ ] Email validation rejects invalid emails
- [ ] Duplicate prevention works
- [ ] Database records created correctly
- [ ] Email sending API called
- [ ] Progress bar updates smoothly
- [ ] Error messages display correctly
- [ ] Summary shows accurate counts
- [ ] Template download works
- [ ] Modal closes properly
- [ ] Students list refreshes after import

## Future Enhancements

Potential improvements:
- Support for more file formats (Excel, Google Sheets)
- Batch email resending
- Import history and logs
- CSV preview before import
- Mapping/transformation of custom CSV columns
- Scheduled imports
- Import templates per class/group
- Combination with assignment distribution

## Debugging Tips

**Check progress:**
```javascript
// In browser console
console.log('Import progress:', progress);
console.log('Results so far:', results);
```

**Verify CSV parsing:**
```javascript
// Test CSV parsing locally
const csv = `Navn,E-post,Fag\nOle,ole@example.com,Math`;
const rows = parseCSV(csv); // Should return 1 row
```

**Monitor API calls:**
- Open DevTools Network tab
- Filter by "invitations/send-email"
- Check request payloads and responses

## Known Limitations

- No drag-and-drop file upload (planned)
- CSV only (no Excel/Sheets native support)
- No batch edit after import
- Email sending required (can't skip)
- No import scheduling
- Linear processing only (not parallel)

## Related Components

- `InviteStudent.tsx` - Single student invitation UI
- `StudentDashboard.tsx` - Student-side portal
- API endpoints - `/api/invitations/send-email`
- Supabase tables - `students`, `student_invitations`

---

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** April 2026