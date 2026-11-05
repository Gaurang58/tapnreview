-- A store's review link must be an https link on one of Google's own hosts, enforced
-- in the database as well as the app. Without this, anyone able to call the Supabase
-- API directly (a compromised manager login, say) could point a store's card at a scam
-- page. Mirrors lib/redirect/url.ts. No userinfo ("google.com@evil.example") and no port.
alter table stores add constraint stores_review_url_google check (
  google_review_url ~* '^https://(search\.google\.com|www\.google\.com|google\.com|maps\.google\.com|g\.page|maps\.app\.goo\.gl|goo\.gl|business\.google\.com|(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?)([/?#]|$)'
);
