ALTER TABLE public.essays
  ADD COLUMN c1_score integer,
  ADD COLUMN c2_score integer,
  ADD COLUMN c3_score integer,
  ADD COLUMN c4_score integer,
  ADD COLUMN c5_score integer,
  ADD COLUMN total_score integer,
  ADD COLUMN c1_feedback text,
  ADD COLUMN c2_feedback text,
  ADD COLUMN c3_feedback text,
  ADD COLUMN c4_feedback text,
  ADD COLUMN c5_feedback text,
  ADD COLUMN general_feedback text,
  ADD COLUMN corrected_at timestamptz;