-- Enable RLS for users table
alter table users enable row level security;

-- Allow users to update their own records
create policy "Users can update own record"
    on users
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Allow users to view their own records
create policy "Users can view own record"
    on users
    for select
    using (auth.uid() = id);

-- Allow insert during registration
create policy "Users can insert during registration"
    on users
    for insert
    with check (true);