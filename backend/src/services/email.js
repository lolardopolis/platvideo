import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

export async function sendVerificationEmail(email, name, token) {
  try {
    const verifyUrl = `${APP_URL}/verify?token=${token}`;
    
    const { data, error } = await resend.emails.send({
      from: `ClassLink <${FROM_EMAIL}>`,
      to: email,
      subject: 'Verifica tu cuenta en ClassLink',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 40px 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 40px; border: 1px solid #334155; }
            .logo { font-size: 24px; font-weight: bold; color: #3b82f6; margin-bottom: 24px; }
            h1 { color: #ffffff; margin: 0 0 16px; font-size: 24px; }
            p { color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
            .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
            .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; }
            .link { color: #3b82f6; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">📚 ClassLink</div>
            <h1>¡Hola ${name}!</h1>
            <p>Gracias por registrarte en ClassLink. Para completar tu registro y acceder a todos los cursos, verifica tu email haciendo click en el botón:</p>
            <a href="${verifyUrl}" class="button">Verificar mi Email</a>
            <p style="margin-top: 24px; font-size: 14px;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p class="link" style="font-size: 12px;">${verifyUrl}</p>
            <div class="footer">
              Este email fue enviado porque alguien se registró con esta dirección en ClassLink. Si no fuiste tú, puedes ignorar este mensaje.
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return false;
    }
    
    console.log('✅ Verification email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email, name, token) {
  try {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    
    const { data, error } = await resend.emails.send({
      from: `ClassLink <${FROM_EMAIL}>`,
      to: email,
      subject: 'Recupera tu contraseña - ClassLink',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 40px 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 40px; border: 1px solid #334155; }
            .logo { font-size: 24px; font-weight: bold; color: #3b82f6; margin-bottom: 24px; }
            h1 { color: #ffffff; margin: 0 0 16px; font-size: 24px; }
            p { color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
            .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
            .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">📚 ClassLink</div>
            <h1>Recuperar Contraseña</h1>
            <p>Hola ${name}, recibimos una solicitud para restablecer tu contraseña. Haz click en el botón para crear una nueva:</p>
            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
            <div class="footer">
              Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este email.
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return false;
    }
    
    console.log('✅ Password reset email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}
