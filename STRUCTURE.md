# Project Structure and Tech Stack

## Folder and File Structure

```
AGENTS.md
CLAUDE.md
eslint.config.mjs
next-env.d.ts
next.config.ts
package.json
postcss.config.mjs
README.md
tsconfig.json
app/
  globals.css
  layout.tsx
  loading.tsx
  page.tsx
  api/
    push/
      subscribe/
        route.ts
  components/
    Container.tsx
    CTASection.tsx
    FeatureCard.tsx
    Features.tsx
    Footer.tsx
    Hero.tsx
    HowItWorks.tsx
    SectionHeader.tsx
    StatsBar.tsx
    StepCard.tsx
    Topbar.tsx
    client/
      AdminDashboardClient.tsx
      AdminMapView.tsx
      AdminReportCard.tsx
      AppSplash.tsx
      AuthFormStatus.tsx
      CancelReportButton.tsx
      DashboardClient.tsx
      LoginForm.tsx
      PushSubscribeButton.tsx
      RegisterForm.tsx
      ReportCard.tsx
      ReportFormClient.tsx
      ServiceWorkerRegister.tsx
      StatCard.tsx
      ToastStack.tsx
      ui/
        Button.tsx
        SelectInput.tsx
        Textarea.tsx
        TextInput.tsx
  dashboard/
    page.tsx
  lib/
    constants.ts
    utils.ts
  login/
    page.tsx
  register/
    page.tsx
  report/
    page.tsx
  types/
    report.ts
docs/
  overview.md
lib/
  actions/
    reportActions.ts
  auth/
    actions.ts
    session.ts
  push/
    send.ts
  supabase/
    client.ts
    server.ts
public/
  manifest.json
  sw.js
types/
  report.ts
  user.ts
```

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js (App Router) |
| Language | TypeScript |
| UI | React, Tailwind CSS |
| Database | Supabase (database only) |
| Auth | Custom email + password (hashed) |
| Deployment | Vercel |
