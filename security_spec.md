# Hujju Firestore Security Architecture (`security_spec.md`)

## 1. Data Invariants

1. **Ownership & Identity Integrity**: Every document across `/messages`, `/documents`, `/projects`, `/notes`, `/skills`, and `/devices` MUST contain an `ownerId` string matching `request.auth.uid` and verified email (`request.auth.token.email_verified == true`).
2. **Path Variable Hardening**: Every document ID (`{messageId}`, `{documentId}`, `{projectId}`, `{noteId}`, `{skillId}`, `{deviceId}`) MUST match `^[a-zA-Z0-9_\-]+$` and be `<= 128` chars on single-document operations (`get`, `create`, `update`, `delete`).
3. **Strict Key & Size Enforcement**: Every entity validation helper (`isValidChatMessage`, `isValidDocumentRecord`, `isValidProjectItem`, `isValidWorkspaceNote`, `isValidSkillConfig`, `isValidDeviceNode`) enforces `keys().hasAll(...)` and `keys().hasOnly(...)` along with strict `minLength` / `maxLength` bounds from `firebase-blueprint.json`.
4. **Temporal & Immutable Fields**: `createdAt == request.time` on `create`. On `update`, `ownerId` and `createdAt` are immutable (`incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`), and `updatedAt == request.time`.
5. **Terminal State Locking**: Once a `ProjectItem` reaches `status == 'completed'`, further updates are rejected unless performed by the verified bootstrapped admin.
6. **Zero-Trust List Queries**: All `allow list` rules explicitly validate `resource.data.ownerId == request.auth.uid`.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on Create**: Creating `/messages/msg_1` with `ownerId: "victim_uid"` while authenticated as `"attacker_uid"`.
2. **Unverified Email Write**: Creating `/projects/proj_1` with `request.auth.token.email_verified == false`.
3. **Shadow Field Injection on Create**: Creating `/notes/note_1` with an extra field `"isAdminOverride": true`.
4. **Shadow Field Injection on Update**: Updating `/skills/skill_1` with `affectedKeys` containing `"ownerId"` or an undeclared key `"hiddenBackdoor"`.
5. **Value Poisoning on Update**: Updating `/projects/proj_1` status to `"hacked_status"` (outside enum `['planning', 'active', 'review', 'completed']`).
6. **Terminal State Bypass**: Updating `/projects/proj_completed` when `existing().status == 'completed'`.
7. **Timestamp Forgery on Create**: Creating `/documents/doc_1` with a past client timestamp (`createdAt != request.time`).
8. **Immutable Field Mutation**: Updating `/devices/dev_1` to alter `createdAt` or `ownerId`.
9. **Path ID Poisoning**: Creating `/messages/invalid$id!@#` with non-alphanumeric characters.
10. **Denial-of-Wallet Oversized Payload**: Creating `/messages/msg_big` with `content.size() > 16000`.
11. **Cross-Tenant Document Read (`get`)**: Authenticated user `"attacker_uid"` reading `/documents/doc_victim` where `resource.data.ownerId == "victim_uid"`.
12. **Blanket List Query Scraping (`list`)**: Authenticated user executing an unconstrained `list` query on `/notes` without filtering `ownerId == request.auth.uid`.
