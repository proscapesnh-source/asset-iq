# Soft Launch Checklist
1. Run the v1.8 migration once.
2. Copy the working local `.env` into this folder; never distribute secrets in the app ZIP.
3. Run `npm install` and `npm run build`.
4. Deploy the PWA over HTTPS before customer use.
5. Create/test organization roles and confirm only supervisors/admins see the Supervisor view.
6. Complete one full workflow: asset → Asset DNA → inspection → reviewed findings → report → work order → supervisor audit trail.
7. Test iPhone/Android install, camera capture, QR deep link, sign-out/sign-in, and poor-signal draft behavior.
8. Use real organizational data only with permission and appropriate access controls.
