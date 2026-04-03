import React from 'react';

const sharedStyles = {
  main: {
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
    padding: '40px 20px',
  },
  container: {
    margin: '0 auto',
    padding: '40px 32px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    maxWidth: '600px',
    border: '1px solid #e2e8f0',
    textAlign: 'center' as const,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  logo: {
    margin: '0 auto 32px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: '-0.025em',
  },
  logoIcon: {
    color: '#4f46e5',
    marginRight: '8px',
  },
  h1: {
    color: '#0f172a',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 24px',
    padding: '0',
  },
  text: {
    color: '#475569',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '0 0 20px',
    textAlign: 'left' as const,
  },
  textCenter: {
    color: '#475569',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '0 0 20px',
    textAlign: 'center' as const,
  },
  buttonContainer: {
    margin: '32px 0',
    textAlign: 'center' as const,
  },
  button: {
    backgroundColor: '#4f46e5', // Lilla/Indigo
    borderRadius: '8px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    padding: '16px 32px',
  },
  hr: {
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderWidth: '1px 0 0 0',
    margin: '32px 0 24px',
  },
  footer: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: '22px',
    textAlign: 'center' as const,
  },
};

const LogoHeader = () => (
  <div style={sharedStyles.logo}>
    <span style={sharedStyles.logoText}>
      <span style={sharedStyles.logoIcon}>✦</span>
      TutorFlyt
    </span>
  </div>
);

export function StudentInviteEmail({ 
  teacherName = '[Lærers navn]', 
  loginUrl = '#' 
}) {
  return (
    <div style={sharedStyles.main}>
      <div style={sharedStyles.container}>
        <LogoHeader />
        <h1 style={sharedStyles.h1}>Velkommen til din nye læringsportal!</h1>
        <p style={sharedStyles.textCenter}>
          <strong>{teacherName}</strong> har invitert deg til TutorFlyt. Her vil du få full oversikt over dine timer, læringsressurser og fremgang.
        </p>
        <div style={sharedStyles.buttonContainer}>
          <a href={loginUrl} style={sharedStyles.button}>
            Logg inn på din portal
          </a>
        </div>
        <hr style={sharedStyles.hr} />
        <p style={sharedStyles.footer}>
          TutorFlyt brukes av profesjonelle lærere for å sikre en trygg og effektiv læringsopplevelse.
        </p>
      </div>
    </div>
  );
}

export function MagicLinkEmail({ loginUrl = '#' }) {
  return (
    <div style={sharedStyles.main}>
      <div style={sharedStyles.container}>
        <LogoHeader />
        <h1 style={sharedStyles.h1}>Logg inn på TutorFlyt</h1>
        <p style={sharedStyles.textCenter}>Hei!</p>
        <p style={sharedStyles.textCenter}>
          Klikk på knappen under for å logge inn på din TutorFlyt-konto. Denne lenken er gyldig i 24 timer for din sikkerhet.
        </p>
        <div style={sharedStyles.buttonContainer}>
          <a href={loginUrl} style={sharedStyles.button}>
            Logg inn
          </a>
        </div>
        <hr style={sharedStyles.hr} />
        <p style={sharedStyles.footer}>
          Hvis du ikke ba om denne e-posten, kan du trygt ignorere den.
        </p>
      </div>
    </div>
  );
}

export function TeacherWelcomeEmail({ dashboardUrl = '#' }) {
  return (
    <div style={sharedStyles.main}>
      <div style={sharedStyles.container}>
        <LogoHeader />
        <h1 style={sharedStyles.h1}>Gratulerer! 🎉</h1>
        <p style={sharedStyles.textCenter}>
          Du er nå i gang med TutorFlyt. Nå kan du invitere din første elev og profesjonalisere hverdagen din.
        </p>
        <div style={sharedStyles.buttonContainer}>
          <a href={dashboardUrl} style={sharedStyles.button}>
            Gå til dashbordet
          </a>
        </div>
        <hr style={sharedStyles.hr} />
        <p style={sharedStyles.textCenter}>
          Trenger du hjelp? Vi er her for deg. Bare svar på denne e-posten, så hjelper vi deg i gang.
        </p>
      </div>
    </div>
  );
}
