# TODO — messages tamper-trigger

## Context
Audit 2026-05-03. Berichten zijn nu immutable na verzending (msg_update_own
gedropped, alleen msg_update_party voor read-status).

RLS kan geen kolom-restriction. Theoretisch kan een conversation-party
nog steeds via UPDATE iets anders dan read-status muteren, want RLS
blokkeert alleen op rij-niveau.

## Wat te doen voor sluitende tamper-protection

CREATE OR REPLACE FUNCTION prevent_message_tampering()
RETURNS trigger AS $$
BEGIN
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN
    RAISE EXCEPTION 'sender_id mag niet muteren';
  END IF;
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    RAISE EXCEPTION 'content is immutable na verzending';
  END IF;
  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    RAISE EXCEPTION 'conversation_id mag niet muteren';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER messages_tamper_guard
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_message_tampering();

## Niet doen
TBD — Barry te bevestigen

## Trigger om te bouwen
Voor productie-launch. Niet kritisch tijdens UAT, want huidige client
muteert alleen read-flag. Aanvalsoppervlak is theoretisch.
