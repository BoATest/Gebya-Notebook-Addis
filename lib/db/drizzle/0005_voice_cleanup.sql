-- Voice schema cleanup: drop 6 dead voice-feature columns from transactions.
-- was_edited is retained — it is actively used by edit handlers and trustScore.
ALTER TABLE transactions
  DROP COLUMN IF EXISTS raw_transcript,
  DROP COLUMN IF EXISTS detected_total,
  DROP COLUMN IF EXISTS transcription_provider,
  DROP COLUMN IF EXISTS parsing_confidence,
  DROP COLUMN IF EXISTS voice_note,
  DROP COLUMN IF EXISTS raw_audio_ref;
