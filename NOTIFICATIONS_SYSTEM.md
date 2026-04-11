# Student Notifications System

## Overview
The notifications system shows students "What's New" updates since their last login, including:
- New vacation/holiday events from their teacher
- New messages received while offline
- New resources assigned to them

## How It Works

### 1. Last Seen Tracking
- Students table has a `last_seen_at` timestamp field
- Updated automatically when students log in
- Used to determine what counts as "new"

### 2. Notification Types

#### Vacation Events
- Fetches vacation dates created after student's `last_seen_at`
- Shows: "Ny ferie/fravær: Lærer har registrert ferie/fravær [date]"
- Icon: Purple calendar (same as teacher calendar)

#### New Messages
- Fetches messages from student's conversation with tutor
- Shows sender name and message preview (first 50 chars)
- Only messages sent after `last_seen_at`

#### New Resources
- Fetches resource assignments created after `last_seen_at`
- Shows resource title that was assigned
- Icon: Green file icon

### 3. UI Components

#### Notification Bell
- Fixed position in top-right corner
- Shows red badge with unread count (max 9+)
- Click to open notifications modal

#### Notifications Modal
- Lists all new notifications since last login
- Each notification shows:
  - Icon (calendar/message/file)
  - Title and description
  - Timestamp
- "Merk alle som lest" button updates `last_seen_at`

### 4. Database Changes

#### Migration: `20260413000000_add_student_last_seen.sql`
```sql
-- Add last_seen_at field to students table
ALTER TABLE public.students ADD COLUMN last_seen_at TIMESTAMPTZ;

-- Allow students to update their own last_seen_at
CREATE POLICY "Students can update their own profile_id and last_seen_at"
    ON public.students FOR UPDATE
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());
```

## Usage

1. **Run Migration**: Apply `20260413000000_add_student_last_seen.sql` in Supabase
2. **Student Login**: `last_seen_at` automatically updates
3. **View Notifications**: Click bell icon in top-right
4. **Mark as Read**: Click "Merk alle som lest" to update `last_seen_at`

## Technical Details

- **Component**: `Notifications.tsx`
- **Integration**: Added to `StudentDashboard.tsx`
- **State**: `lastSeenAt` and `student` state variables
- **Queries**: Separate fetches for vacations, messages, and resources
- **Fallback**: Defaults to 7 days ago if no `last_seen_at`

## Security

- Students only see their own tutor's vacations
- Messages only from their conversation
- Resources only assigned to them
- All queries respect existing RLS policies