# UNC email verification research
Date: 2026-09-21
Status: research only; not an accepted access policy.

UNC Law's student technology guidance distinguishes the Microsoft sign-in identity `onyen@ad.unc.edu` from `onyen@live.unc.edu`: https://tarheels.live/unclawtech/email-and-microsoft-office/ . A sign-in identifier must not automatically be treated as the right deliverable signup email.

UNC's orientation staff policy describes university-managed email as including addresses ending in `unc.edu`, including the student HeelMail service `live.unc.edu`; it also covers faculty and staff: https://nsfp.unc.edu/wp-content/uploads/2024/09/OL-2025-Job-Description.pdf . Thus university email ownership alone should not be described as proof of current student enrollment.

Before production auth implementation, establish an explicit exact-domain allowlist and decide whether the MVP verification badge means university email confirmed or independently verified current student enrollment. Do not use a broad suffix check or silently claim enrollment verification. Keep local synthetic test fixtures separate from a production eligibility policy.
