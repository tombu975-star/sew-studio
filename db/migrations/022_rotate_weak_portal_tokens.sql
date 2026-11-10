-- Portal tokens issued before the switch to crypto-random generation were
-- ~16 chars from Math.random(). Clear them so they are re-issued securely the
-- next time the owner shares a link. (New tokens are 43 chars.)
update public.customers
   set portal_token = null
 where portal_token is not null and length(portal_token) < 40;
