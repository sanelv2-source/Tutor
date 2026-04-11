# Communication Breakdown Investigation & Fix

## 🔍 Root Cause Analysis

The student portal stopped showing assignments and resources after recent updates due to **conflicting and recursive RLS (Row Level Security) policies**.

### Issues Identified

#### 1. **Multiple Policy Versions (Conflicting)**
The system has conflicting policies creating from multiple migrations:

- `20260403000000_resources.sql` - Original policies with JOINs
- `20260411000001_improve_resource_rls.sql` - v2 policies attempting fixes
- `20260411000002_fix_resource_rls_recursion.sql` - v3 policies 
- `20260413000001_fix_all_resource_policies.sql` - Another attempt to fix

**Problem**: Old policies were never properly dropped, so v2 and v3 versions coexist with originals, creating conflicts.

#### 2. **Infinite Recursion in Original Policy**
The original policy in `20260403000000_resources.sql` (line 42-48) uses:
```sql
EXISTS (
    SELECT 1 FROM public.resource_assignments ra
    JOIN public.students s ON ra.student_id = s.id
    WHERE ra.resource_id = public.resources.id
    AND s.profile_id = auth.uid()
)
```

**Problem**: The JOIN on `public.students` triggers that table's RLS policy, which includes:
```sql
email = (SELECT email FROM auth.users WHERE id = auth.uid())
```

This deep nesting causes performance issues and potential infinite recursion.

#### 3. **Missing Assignments Visibility**
Students couldn't see assignments because:
- The `assignments` table policy checks if the assignment exists for that student
- But the `students` table has a complex RLS policy with subqueries
- Together they create expensive/slow queries that fail or timeout

## 🛠️ The Fix

### New Migration: `20260414000000_comprehensive_rls_cleanup.sql`

This migration:

1. **Drops ALL conflicting policies** - Removes every version (v1, v2, v3, etc.)
2. **Creates simple, non-recursive policies** - Uses `IN` subqueries instead of JOINs
3. **Maintains security** - Still restricts access properly, just more efficiently
4. **Adds performance indexes** - Helps queries execute faster

### Key Improvements

**Before** (Recursive/Complex):
```sql
-- Uses JOIN which triggers RLS on students table
EXISTS (
    SELECT 1 FROM resource_assignments ra
    JOIN public.students s ON ra.student_id = s.id
    ...
)
```

**After** (Simple/Direct):
```sql
-- Uses IN subquery, no recursive RLS evaluation
id IN (
    SELECT ra.resource_id 
    FROM resource_assignments ra
    WHERE ra.student_id IN (
        SELECT s.id FROM students s WHERE s.profile_id = auth.uid()
    )
)
```

## 📋 How to Apply the Fix

### Step 1: Run the Cleanup Migration
Go to **Supabase Dashboard** → **SQL Editor** → Run this:
```sql
-- Copy and run the entire contents of:
-- supabase/migrations/20260414000000_comprehensive_rls_cleanup.sql
```

### Step 2: Verify in Browser Console

Open Student Portal and check console for errors:

```javascript
// These should appear in console.log:
Assignments query result: [array of assignments]
Assignments query error: null

Error fetching resource assignments: null (or empty error means success)
Fetched resources: [array of resources]
```

**Bad signs** (means RLS is still broken):
```
Assignments query error: RLS policy violation
Error fetching resource assignments: 403 Forbidden
Fetched resources: 403 Forbidden
```

### Step 3: Verify Teacher Dashboard Still Works

Teacher should still see:
- ✅ Student list
- ✅ Resources they created
- ✅ Assignments they created
- ✅ Ability to assign resources to students

### Step 4: Verify Student Sync

Check that:
1. **Student sees assignments** ✅
2. **Student sees resources assigned to them** ✅
3. **Student can submit work** ✅
4. **Student sees teacher feedback** ✅
5. **Calendar shows teacher vacations** ✅

## 🧪 Testing Queries

If you want to manually test the RLS policies in Supabase SQL Editor:

### Test 1: Student can see their assignments
```sql
-- Run as the student user (use impersonation if available)
SELECT id, title, student_id, tutor_id 
FROM public.assignments 
WHERE student_id = (
    SELECT id FROM public.students 
    WHERE profile_id = auth.uid()
);
-- Should return: list of student's assignments
-- Should NOT return: 403 if working
```

### Test 2: Student can see assigned resources
```sql
SELECT r.* 
FROM public.resources r
WHERE r.id IN (
    SELECT ra.resource_id 
    FROM public.resource_assignments ra
    WHERE ra.student_id IN (
        SELECT s.id FROM public.students s 
        WHERE s.profile_id = auth.uid()
    )
);
-- Should return: list of resources assigned to student
```

### Test 3: Teacher can see their resources
```sql
-- Run as the teacher user
SELECT id, title, tutor_id 
FROM public.resources 
WHERE tutor_id = auth.uid();
-- Should return: list of teacher's resources
```

## 🚨 If Still Having Issues

### Signs of Remaining Problems

1. **Still seeing 403 errors**
   - Check that the new migration was applied
   - Verify all old policies were dropped (they might still be cached in Supabase)

2. **Resources showing for wrong students**
   - Check `resource_assignments` table - verify entries are correct
   - Verify `students.tutor_id` matches correctly

3. **Assignments not showing**
   - Manually check: Can the student's `profile_id` find their `student` record?
   - Run: `SELECT * FROM students WHERE profile_id = auth.uid();`

4. **Performance is still slow**
   - Verify indexes were created: Check in Supabase → Table → Indexes
   - Try rebuilding indexes: `REINDEX TABLE public.resources;`

## 📊 Summary of Changes

| Component | Status | Fix |
|-----------|--------|-----|
| Assignments visibility | ❌ Broken | RLS policy was causing query failures |
| Resources visibility | ❌ Broken | Multiple conflicting RLS policies |
| Calendar sync | ❌ Broken | Same RLS issues blocked vacation table |
| Message history | ⚠️ Unknown | Check if conversation queries are working |
| Teacher feedback | ⚠️ Unknown | Depends on assignments visibility |

The new cleanup migration should fix all of these by establishing a single, clean set of policies without recursion.
