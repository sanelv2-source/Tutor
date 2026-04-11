# Resource Sharing Debugging Guide

## The Problem
Resources uploaded by teachers and assigned to students (e.g., 'Elvis') don't appear on the student's side.

## The Solution - Complete Checklist

### 1. CHECK DATABASE ENTRIES (Supabase Dashboard)

**In `resources` table:**
- ✅ Resource exists with correct `tutor_id`
- ✅ `title`, `type`, and `file_path` (or `url`) are filled
- Example:
  ```
  id: 123-456
  tutor_id: teacher-uuid-here
  title: "Math Worksheet"
  type: "file"
  file_path: "bucket/path/file.pdf"
  created_at: 2026-04-11
  ```

**In `resource_assignments` table:**
- ✅ Entry exists linking the resource to the student
- ✅ `resource_id` matches the resource from above
- ✅ `student_id` matches the student's ID (NOT the profile_id)
- Example:
  ```
  id: abc-def
  resource_id: 123-456
  student_id: elvis-student-uuid
  assigned_at: 2026-04-11
  ```

### 2. FIND THE CORRECT STUDENT ID

**IMPORTANT:** The `student_id` in `resource_assignments` must be from the `students` table, NOT the `profiles` table!

```sql
-- Find correct student ID for a student named 'Elvis'
SELECT 
  s.id as student_id,
  s.full_name,
  p.id as profile_id,
  p.email
FROM students s
JOIN profiles p ON s.profile_id = p.id
WHERE s.full_name = 'Elvis';
```

Use the `s.id` value (student_id), NOT the `p.id` value!

### 3. VERIFY RLS POLICIES

**Check if policies are enabled:**
```sql
-- In Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE row_security_enabled = true 
AND table_schema = 'public';
```

Should show: `resources` and `resource_assignments`

**Test if student can read resource_assignments:**
1. Log in as the student (Elvis)
2. Open browser DevTools Console
3. Run:
   ```javascript
   const { data, error } = await supabase
     .from('resource_assignments')
     .select('*');
   console.log('RA Data:', data);
   console.log('RA Error:', error);
   ```
   Should return the assignment record if policies work.

### 4. CHECK BROWSER CONSOLE LOGS

**When resources page loads, look for:**

```
// Good signs:
Fetched resource assignments: [{resource_id: '...', ...}]
Fetched resources: [{id: '...', title: 'Math Worksheet', ...}]

// Bad signs:
No resource assignments found for student
Error fetching resources: "RLS policy violation"
Error fetching resources: "permission denied"
```

### 5. VERIFY STORAGE FILE ACCESS

**If resources show but files don't open:**
1. Check browser console for 403 errors
2. Verify file exists in Supabase Storage > buckets > resources
3. Ensure storage is marked as `public: true` in migration

### 6. TEST THE COMPLETE FLOW

**Step-by-step teacher side:**
1. Teacher uploads file
2. Check console: `Inserting resource assignments: [...]`
3. Check console: `ASSIGNMENT INSERT SUCCESS: {...}`
4. Verify in Supabase Dashboard:
   - Resource exists in `resources` table
   - Assignment exists in `resource_assignments` table

**Step-by-step student side:**
1. Student logs in
2. Navigate to Resources tab
3. Check console for fetch results
4. Verify student_id matches in database

### 7. MANUAL TEST QUERY

**If nothing appears on student side, run this in Supabase SQL Editor as the student user:**

```sql
-- Run this as authenticated user (student Elvis)
SELECT r.* 
FROM resources r
WHERE r.id IN (
  SELECT resource_id FROM resource_assignments ra
  WHERE ra.student_id IN (
    SELECT id FROM students 
    WHERE profile_id = auth.uid()
  )
);
```

Should return the resource records if RLS policies work.

### 8. COMMON ISSUES & FIXES

| Issue | Cause | Fix |
|-------|-------|-----|
| `student_id` is wrong code | Mapped to `profile_id` instead of student `id` | Use correct student UUID from `students.id` |
| RLS policy error | Old migration not applied | Run new migration: `20260411000001_improve_resource_rls.sql` |
| No resources shown | `resource_assignments` table missing entries | Verify teacher clicked "Legg til ressurs" and selected students |
| Resources appear but files 404 | Storage path incorrect | Check `file_path` format in `resources` table |
| Permission denied errors | RLS policy too restrictive | Update RLS policies from new migration |

### 9. APPLY FIXES

1. **Update database schema:**
   ```bash
   # In Supabase Dashboard > SQL Editor, run the migration:
   supabase/migrations/20260411000001_improve_resource_rls.sql
   ```

2. **Refresh student browser:**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Or clear localStorage: `localStorage.clear()`
   - Log out and log back in

3. **Check console logs** for any errors

### 10. DETAILED VERIFICATION SCRIPT

**Run in browser console as the student:**

```javascript
// 1. Check current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user.id);

// 2. Find student record
const { data: student } = await supabase
  .from('students')
  .select('*')
  .eq('profile_id', user.id)
  .single();
console.log('Student record:', student);

// 3. Check resource assignments
const { data: assignments } = await supabase
  .from('resource_assignments')
  .select('*')
  .eq('student_id', student.id);
console.log('Resource assignments:', assignments);

// 4. Check resources
if (assignments && assignments.length > 0) {
  const resourceIds = assignments.map(a => a.resource_id);
  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .in('id', resourceIds);
  console.log('Resources:', resources);
}
```

This script will show you exactly where the data flow breaks.