export type LegalBlock = string | { list: readonly string[] };

export type LegalSection = {
  id: string;
  heading: string;
  body: readonly LegalBlock[];
};

export type LegalDocument = {
  eyebrow: string;
  title: string;
  lead: string;
  effectiveDate: string;
  sections: readonly LegalSection[];
};

/**
 * Bump when either document changes materially. The Android app stores the
 * version a user accepted (LegalConsent.CURRENT_VERSION) and asks again when
 * it is behind, so keep the two in step.
 */
export const LEGAL_VERSION = 1;

export const LEGAL_EFFECTIVE_DATE = '13 October 2026';

// TODO(before release): replace with the real privacy contact address.
export const LEGAL_CONTACT = '[privacy contact email — to be added]';

export const PRIVACY_POLICY: LegalDocument = {
  eyebrow: 'Privacy Policy',
  title: 'How ChartShop handles your data',
  lead:
    'ChartShop is a point-of-sale and bookkeeping tool for small shops. This policy explains what we collect when you use the website, the Android app, or our Telegram and WhatsApp bots, why we need it, and the choices you have.',
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      id: 'who-we-are',
      heading: 'Who we are',
      body: [
        'ChartShop ("we", "us") provides the ChartShop service in Zimbabwe. For the purposes of the Cyber and Data Protection Act [Chapter 12:07] we are the data controller for account information, and we process your shop records on your behalf.',
        `You can reach us about anything in this policy at ${LEGAL_CONTACT}.`,
      ],
    },
    {
      id: 'what-we-collect',
      heading: 'What we collect',
      body: [
        'We only collect what the service needs to work:',
        {
          list: [
            'Account details: your shop name and description, your username and display name, and your role in the shop (admin or member).',
            'Your PIN, stored only as a one-way hash. We never see or store the PIN itself. Recovery and invite codes are hashed in the same way.',
            'Shop records you enter: products, stock levels, sales, lay-byes, orders, expenses, and reports.',
            'Customer records you enter: names, phone numbers, optional email addresses, purchase history, and credit balances.',
            'Linked channels: your Telegram chat ID and, once WhatsApp is available, your WhatsApp phone number, if you choose to link them.',
            'Security data: sign-in times, failed PIN attempts, active sessions, and an activity log of changes made in your shop.',
            'Technical data: your IP address and basic request information, used to rate-limit abuse and keep the service secure.',
          ],
        },
        'We do not use advertising trackers or third-party analytics, and we do not sell your data.',
      ],
    },
    {
      id: 'customer-data',
      heading: 'Your customers’ information',
      body: [
        'When you add customers to ChartShop, you decide what is recorded about them, and you are responsible for having a lawful reason to do so — for example, keeping track of credit you have extended to them. Only collect what you need, and tell your customers you keep these records if they ask.',
        'We process customer records only to provide the service to your shop. We do not contact your customers or use their details for any other purpose.',
      ],
    },
    {
      id: 'how-we-use',
      heading: 'How we use it',
      body: [
        {
          list: [
            'To run your shop’s books: recording sales, tracking stock and credit, and producing reports.',
            'To sign you in and keep your account secure, including locking an account after repeated wrong PINs.',
            'To deliver the reminders and notifications you turn on, such as low-stock and credit-due alerts.',
            'To answer support requests and fix problems with the service.',
          ],
        },
        'We rely on the contract between you and us to provide the service, and on our legitimate interest in keeping it secure and working.',
      ],
    },
    {
      id: 'sharing',
      heading: 'Who we share it with',
      body: [
        'Within your shop, other team members can see the shop’s records according to their role. Outside your shop, we share data only with the service providers we need to run ChartShop:',
        {
          list: [
            'Render — hosts the ChartShop server.',
            'MongoDB Atlas — stores the database.',
            'Vercel — hosts the website.',
            'Telegram and Meta (WhatsApp) — deliver messages when you use those channels. Their own privacy policies apply to what they handle.',
          ],
        },
        'We may also disclose information when the law requires it, for example in response to a valid court order.',
      ],
    },
    {
      id: 'transfers',
      heading: 'Storage outside Zimbabwe',
      body: [
        'Our hosting providers run their servers outside Zimbabwe, so your data is stored and processed abroad. We choose providers that protect data with encryption in transit and at rest and access controls. By using ChartShop you consent to this transfer.',
      ],
    },
    {
      id: 'retention',
      heading: 'How long we keep it',
      body: [
        {
          list: [
            'Shop and customer records are kept while your shop’s account is open.',
            'Sign-in sessions expire after 24 hours without activity.',
            'Activity logs are deleted automatically after about 18 months.',
            'When you ask us to close your shop’s account, we delete or anonymise its data within 30 days, except where we must keep something by law.',
          ],
        },
      ],
    },
    {
      id: 'security',
      heading: 'How we protect it',
      body: [
        'Connections to ChartShop are encrypted. PINs and recovery codes are hashed, accounts lock after repeated wrong PINs, and the Android app keeps your sign-in encrypted on the device using the Android Keystore. No system is perfectly secure, so keep your PIN private and sign out of shared devices.',
      ],
    },
    {
      id: 'your-rights',
      heading: 'Your rights',
      body: [
        'Under the Cyber and Data Protection Act you can ask to access the personal data we hold about you, to correct it, to delete it, or to object to how we process it. Shop admins can view and correct most records directly in ChartShop. For anything else, contact us and we will respond within 30 days.',
        'If you are not satisfied with our response, you can complain to the Data Protection Authority (POTRAZ).',
      ],
    },
    {
      id: 'children',
      heading: 'Children',
      body: [
        'ChartShop is a business tool and is not intended for anyone under 18. We do not knowingly collect information from children.',
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to this policy',
      body: [
        'If we change this policy in a way that matters, we will update the date at the top and ask you to review and accept it the next time you open ChartShop.',
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  eyebrow: 'Terms and Conditions',
  title: 'The rules for using ChartShop',
  lead:
    'These terms are an agreement between you and ChartShop. By creating a shop, signing in, or tapping "Agree and continue" in the app, you accept them. Please read them together with our Privacy Policy.',
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      id: 'the-service',
      heading: 'The service',
      body: [
        'ChartShop helps small businesses record sales, manage stock, track customer credit and lay-byes, log expenses, and produce reports. You can use it on the web, in the Android app, and through our Telegram bot, with WhatsApp to follow. All channels work on the same shop records.',
      ],
    },
    {
      id: 'accounts',
      heading: 'Your account',
      body: [
        {
          list: [
            'You must be at least 18 and able to enter a binding agreement, and the information you give us must be accurate.',
            'Whoever creates a shop is its first admin and is responsible for the shop’s account, including team members they invite.',
            'Keep your PIN and recovery codes private. You are responsible for activity under your account until you tell us it has been compromised.',
            'Tell us straight away if you suspect someone else has access to your account.',
          ],
        },
      ],
    },
    {
      id: 'your-data',
      heading: 'Your data',
      body: [
        'Your shop’s records belong to you. You give us permission to store and process them only so we can provide the service. You are responsible for the accuracy of what you enter and for having the right to record your customers’ information.',
      ],
    },
    {
      id: 'acceptable-use',
      heading: 'Acceptable use',
      body: [
        'You agree not to:',
        {
          list: [
            'use ChartShop for anything illegal, including fraud, money laundering, or selling prohibited goods;',
            'try to access another shop’s data or break the service’s security;',
            'overload the service, scrape it, or get around its rate limits;',
            'reverse engineer the apps, except where the law allows it;',
            'use the bots to send spam or unwanted messages.',
          ],
        },
      ],
    },
    {
      id: 'your-records',
      heading: 'Records and tax',
      body: [
        'ChartShop is a record-keeping tool, not an accounting, tax, or legal adviser. Reports reflect what you and your team enter. You remain responsible for your business decisions, your tax returns, and any records the law requires you to keep. Export your reports regularly.',
      ],
    },
    {
      id: 'availability',
      heading: 'Availability and changes',
      body: [
        'We work to keep ChartShop available, but we cannot promise it will be uninterrupted or error-free. The server may take a short while to respond after a quiet period. We may add, change, or remove features. If a change significantly reduces what you can do, we will tell you in advance where we reasonably can.',
      ],
    },
    {
      id: 'fees',
      heading: 'Fees',
      body: [
        'ChartShop is currently free to use. If we introduce paid plans, we will tell you the prices before they apply to you, and you can choose whether to continue.',
      ],
    },
    {
      id: 'termination',
      heading: 'Suspension and closing your account',
      body: [
        'You can stop using ChartShop at any time and ask us to close your shop’s account. We may suspend or close an account that breaks these terms or puts other users or the service at risk; where appropriate, we will warn you first and give you a chance to export your records.',
      ],
    },
    {
      id: 'liability',
      heading: 'Liability',
      body: [
        'ChartShop is provided "as is". To the extent the law allows, we are not liable for indirect or consequential losses such as lost profits, lost stock, or lost data, and our total liability to you is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under the Consumer Protection Act or other laws that cannot be excluded.',
      ],
    },
    {
      id: 'law',
      heading: 'Governing law',
      body: [
        'These terms are governed by the laws of Zimbabwe, and the courts of Zimbabwe have jurisdiction over any dispute. We would always rather sort things out directly first — please contact us.',
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to these terms',
      body: [
        'If we change these terms materially, we will update the date at the top and ask you to accept the new version the next time you open ChartShop. If you do not agree, stop using the service and ask us to close your account.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      body: [`Questions about these terms? Contact us at ${LEGAL_CONTACT}.`],
    },
  ],
};
