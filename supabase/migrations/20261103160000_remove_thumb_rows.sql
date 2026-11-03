-- Streamtape's auto-generated cover images ("Thumb_*.jpg") were imported as films by mistake.
DELETE FROM public.videos WHERE original_title ILIKE 'thumb\_%' ESCAPE '\' AND original_title ~* '\.(jpg|jpeg|png)$';
