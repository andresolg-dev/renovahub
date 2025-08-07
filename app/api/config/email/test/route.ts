import { type NextRequest, NextResponse } from "next/server"
import { Resend } from 'resend'
import nodemailer from "nodemailer"

interface EmailConfig {
  enabled: boolean
  provider: 'resend' | 'smtp'
  // Resend config
  resendApiKey?: string
  // SMTP config
  host?: string
  port?: number
  secure?: boolean
  user?: string
  password?: string
  // Common config
  fromName: string
  fromEmail: string
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    
    // Clean up the config object to remove any masked passwords or API keys
    const config: EmailConfig = {
      ...requestData.config,
      // If the API key or password contains bullet points (•), it's masked and should be rejected
      resendApiKey: requestData.config.resendApiKey?.includes('•') ? undefined : requestData.config.resendApiKey,
      password: requestData.config.password?.includes('•') ? undefined : requestData.config.password
    }
    
    const testEmail: string = requestData.testEmail

    if (!config || !testEmail) {
      return NextResponse.json({ error: "Configuration and test email are required" }, { status: 400 })
    }
    
    // Check if credentials are masked
    if (config.provider === 'resend' && (!config.resendApiKey || config.resendApiKey.includes('•'))) {
      return NextResponse.json({ 
        error: "Please provide a valid Resend API key. The masked key cannot be used." 
      }, { status: 400 })
    }
    
    if (config.provider === 'smtp' && (!config.password || config.password.includes('•'))) {
      return NextResponse.json({ 
        error: "Please provide a valid SMTP password. The masked password cannot be used." 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json({ error: "Invalid test email format" }, { status: 400 })
    }

    if (!config.fromEmail) {
      return NextResponse.json({ error: "fromEmail is required" }, { status: 400 })
    }

    const emailContent = {
      subject: "Prueba de Configuración Email - RenovaHub",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 ¡Configuración Exitosa!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Prueba de Email - RenovaHub</h2>
            <p style="color: #666; line-height: 1.6;">
              ¡Excelente! Tu configuración de email está funcionando correctamente. 
              Este email de prueba confirma que RenovaHub puede enviar notificaciones automáticas.
            </p>
          </div>

          <div style="background: #e8f5e8; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 20px;">
            <h3 style="color: #155724; margin-top: 0;">✅ Configuración Verificada</h3>
            <ul style="color: #155724; margin: 10px 0;">
              <li><strong>Proveedor:</strong> ${config.provider === 'resend' ? 'Resend' : 'SMTP'}</li>
              ${config.provider === 'smtp' ? `<li><strong>Servidor:</strong> ${config.host}:${config.port}</li>` : ''}
              ${config.provider === 'smtp' ? `<li><strong>Seguridad:</strong> ${config.secure ? 'TLS/SSL' : 'STARTTLS'}</li>` : ''}
              <li><strong>Remitente:</strong> ${config.fromName} &lt;${config.fromEmail}&gt;</li>
            </ul>
          </div>

          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">
            <h3 style="color: #856404; margin-top: 0;">📋 Próximos Pasos</h3>
            <p style="color: #856404; margin: 0;">
              Ahora puedes habilitar las notificaciones automáticas para:
            </p>
            <ul style="color: #856404; margin: 10px 0;">
              <li>Licencias próximas a vencer</li>
              <li>Licencias vencidas</li>
              <li>Reportes semanales/mensuales</li>
              <li>Alertas de renovación</li>
            </ul>
          </div>

          <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; margin-top: 30px;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              Este es un email automático generado por RenovaHub<br>
              Fecha: ${new Date().toLocaleString('es-ES')}
            </p>
          </div>
        </div>
      `,
      text: `
=== Configuración de Email Exitosa! ===

Prueba de Email - RenovaHub

¡Excelente! Tu configuración de email está funcionando correctamente. 
Este email de prueba confirma que RenovaHub puede enviar notificaciones automáticas.

=== Configuración Verificada ===
- Proveedor: ${config.provider === 'resend' ? 'Resend' : 'SMTP'}
${config.provider === 'smtp' ? `- Servidor: ${config.host}:${config.port}` : ''}
${config.provider === 'smtp' ? `- Seguridad: ${config.secure ? 'TLS/SSL' : 'STARTTLS'}` : ''}
- Remitente: ${config.fromName} <${config.fromEmail}>

=== Próximos Pasos ===
Ahora puedes habilitar las notificaciones automáticas para:
- Licencias próximas a vencer
- Licencias vencidas
- Reportes semanales/mensuales
- Alertas de renovación

---
Este es un email automático generado por RenovaHub
Fecha: ${new Date().toLocaleString('es-ES')}
      `
    }

    if (config.provider === 'resend') {
      // Use Resend
      if (!config.resendApiKey) {
        return NextResponse.json({ error: "Resend API Key is required" }, { status: 400 })
      }
      
      // Double-check that the API key is not masked
      if (config.resendApiKey.includes('•')) {
        return NextResponse.json({ 
          error: "Cannot use masked API key. Please enter the full API key." 
        }, { status: 400 })
      }
      
      // Validate the from email for Resend
      // Resend requires the domain to be verified or to use their domains
      const fromEmailDomain = config.fromEmail.split('@')[1];
      const resendDomains = ['resend.dev', 'email.resend.dev'];
      
      // Check if using a Resend domain or if we should warn about domain verification
      if (!resendDomains.some(domain => config.fromEmail.endsWith(`@${domain}`))) {
        console.log(`Warning: Using custom domain ${fromEmailDomain} with Resend. Make sure it's verified.`);
      }

      const resend = new Resend(config.resendApiKey)

      try {
        console.log("Attempting to send email with Resend...");
        console.log("From:", `${config.fromName} <${config.fromEmail}>`);
        console.log("To:", testEmail);
        
        // Determine the best "from" address to use
        const fromEmailDomain = config.fromEmail.split('@')[1];
        const resendDomains = ['resend.dev', 'email.resend.dev'];
        const isResendDomain = resendDomains.some(domain => config.fromEmail.endsWith(`@${domain}`));
        
        // Use the configured email if it's a Resend domain, otherwise use a fallback
        // but include the original in the reply-to
        let fromEmail = config.fromEmail;
        let replyTo = undefined;
        
        if (!isResendDomain) {
          // For testing, use a Resend domain but set reply-to to the original
          fromEmail = `${config.fromName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@resend.dev`;
          replyTo = config.fromEmail;
          console.log(`Using Resend domain fallback: ${fromEmail} with reply-to: ${replyTo}`);
        }
        
        const { data, error } = await resend.emails.send({
          from: `${config.fromName} <${fromEmail}>`,
          reply_to: replyTo ? `${config.fromName} <${replyTo}>` : undefined,
          to: [testEmail],
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        if (error) {
          console.error("Resend API error:", JSON.stringify(error, null, 2));
          return NextResponse.json({ 
            error: `Resend API error: ${error.message || JSON.stringify(error)}`,
            details: error
          }, { status: 400 });
        }
        
        if (!data || !data.id) {
          console.error("Resend returned no data or message ID");
          return NextResponse.json({ 
            error: "Resend returned no confirmation data. The email may not have been sent.",
            details: data
          }, { status: 400 });
        }
        
        console.log("Resend email sent successfully with ID:", data.id);
      } catch (resendError: any) {
        console.error("Exception during Resend email sending:", resendError);
        return NextResponse.json({ 
          error: `Exception during Resend email sending: ${resendError.message || "Unknown error"}`,
          details: resendError.toString(),
          stack: resendError.stack
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Email de prueba enviado exitosamente a ${testEmail} usando Resend`,
        messageId: data?.id,
        fromEmail: fromEmail,
        usedFallback: fromEmail !== config.fromEmail,
        originalEmail: config.fromEmail
      })

    } else {
      // Use SMTP
      if (!config.host || !config.user || !config.password) {
        return NextResponse.json({ 
          error: "Host, user, and password are required for SMTP" 
        }, { status: 400 })
      }
      
      // Double-check that the password is not masked
      if (config.password.includes('•')) {
        return NextResponse.json({ 
          error: "Cannot use masked password. Please enter the full password." 
        }, { status: 400 })
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port || 587,
        secure: config.secure || false,
        auth: {
          user: config.user,
          pass: config.password,
        },
        tls: {
          rejectUnauthorized: false
        },
        // Add proper encoding settings
        encoding: 'utf-8',
        charset: 'UTF-8'
      })

      // Verify connection
      await transporter.verify()

      // Send test email
      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: testEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        encoding: 'utf-8',
        textEncoding: 'base64'
      })

      return NextResponse.json({
        success: true,
        message: `Email de prueba enviado exitosamente a ${testEmail} usando SMTP`,
        messageId: info.messageId
      })
    }

  } catch (error: any) {
    console.error("Error testing email config:", error)
    
    // Provide more specific error messages
    let errorMessage = error.message
    
    if (error.code === 'EAUTH') {
      errorMessage = "Error de autenticación. Verifica tu usuario y contraseña."
    } else if (error.code === 'ECONNECTION') {
      errorMessage = "No se pudo conectar al servidor SMTP. Verifica el host y puerto."
    } else if (error.code === 'ESOCKET') {
      errorMessage = "Error de conexión. Verifica la configuración de seguridad (TLS/SSL)."
    } else if (error.responseCode === 535) {
      errorMessage = "Credenciales incorrectas. Verifica tu usuario y contraseña."
    } else if (error.responseCode === 550) {
      errorMessage = "Email rechazado. Verifica el email del remitente."
    } else if (error.name === 'validation_error') {
      errorMessage = "Error de validación en Resend. Verifica tu API Key y email del remitente."
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: error.message 
    }, { status: 400 })
  }
}