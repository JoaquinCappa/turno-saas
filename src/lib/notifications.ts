import { Resend } from 'resend';
import prisma from '@/lib/prisma';
import { toZonedTime, format } from 'date-fns-tz';

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendBookingCreatedEmail(bookingId: string, managementToken?: string) {
  if (!resendApiKey || !emailFrom || !resend) {
    console.warn('RESEND_API_KEY o EMAIL_FROM no configurados. Se omite el envío de email para la reserva:', bookingId);
    return { success: false, reason: 'missing_config' };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        business: true,
        professional: true
      }
    });

    if (!booking) {
      console.error('Booking no encontrada para notificar:', bookingId);
      return { success: false, reason: 'booking_not_found' };
    }

    if (!booking.customer.email) {
      console.log(`El cliente ${booking.customer.name} no tiene email. Se omite notificación.`);
      return { success: false, reason: 'no_customer_email' };
    }

    const { customer, business, professional } = booking;
    const zonedStart = toZonedTime(booking.startAt, business.timezone);
    const zonedEnd = toZonedTime(booking.endAt, business.timezone);

    const dateStr = format(zonedStart, 'dd/MM/yyyy');
    const timeStartStr = format(zonedStart, 'HH:mm');
    const timeEndStr = format(zonedEnd, 'HH:mm');

    const addressLine = business.address ? `<p><strong>Dirección:</strong> ${business.address}</p>` : '';

    let managementLinkHtml = '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (managementToken) {
      if (appUrl) {
        const cleanUrl = appUrl.replace(/\/$/, '');
        const tokenUrl = `${cleanUrl}/mi-turno/${managementToken}`;
        managementLinkHtml = `
          <div style="margin-top: 32px; text-align: center;">
            <a href="${tokenUrl}" style="background-color: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Gestionar mi turno</a>
          </div>
        `;
      } else {
        console.warn('NEXT_PUBLIC_APP_URL no configurado. Se omite enlace de gestión para la reserva:', bookingId);
      }
    }

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #000; margin-bottom: 20px;">¡Tu reserva está confirmada!</h2>
        <p style="font-size: 16px;">Hola <strong>${customer.name}</strong>,</p>
        <p style="font-size: 16px; margin-bottom: 24px;">Tu turno en <strong>${business.name}</strong> ha sido agendado exitosamente.</p>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; color: #555;">Detalles del turno</h3>
          <p style="margin: 8px 0;"><strong>Servicio:</strong> ${booking.serviceName}</p>
          <p style="margin: 8px 0;"><strong>Profesional:</strong> ${professional.name}</p>
          <p style="margin: 8px 0;"><strong>Fecha:</strong> ${dateStr}</p>
          <p style="margin: 8px 0;"><strong>Horario:</strong> ${timeStartStr} a ${timeEndStr}</p>
          <p style="margin: 8px 0;"><strong>Duración:</strong> ${booking.serviceDuration} min</p>
          <p style="margin: 8px 0;"><strong>Precio:</strong> $${booking.servicePrice.toString()}</p>
          ${addressLine}
        </div>

        ${managementLinkHtml}

        <p style="font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; margin-top: 24px;">
          Si tenés alguna duda o necesitás cancelar, por favor comunicate directamente con el negocio o usá el botón de gestión.
        </p>
      </div>
    `;

    const result = await resend.emails.send({
      from: emailFrom,
      to: customer.email!,
      subject: `Reserva confirmada en ${business.name}`,
      html: htmlTemplate
    });

    if (result.error) {
      console.error('Error desde Resend API:', result.error);
      return { success: false, reason: 'provider_error', error: result.error };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Excepción al intentar enviar email con Resend:', error);
    return { success: false, reason: 'exception', error };
  }
}

export async function sendBookingCancelledEmail(bookingId: string) {
  if (!resendApiKey || !emailFrom || !resend) {
    console.warn('RESEND_API_KEY o EMAIL_FROM no configurados. Se omite el envío de email de cancelación para la reserva:', bookingId);
    return { success: false, reason: 'missing_config' };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        business: true,
        professional: true
      }
    });

    if (!booking) {
      console.error('Booking no encontrada para notificar cancelación:', bookingId);
      return { success: false, reason: 'booking_not_found' };
    }

    if (!booking.customer.email) {
      console.log(`El cliente ${booking.customer.name} no tiene email. Se omite notificación de cancelación.`);
      return { success: false, reason: 'no_customer_email' };
    }

    const { customer, business, professional } = booking;
    const zonedStart = toZonedTime(booking.startAt, business.timezone);
    const zonedEnd = toZonedTime(booking.endAt, business.timezone);

    const dateStr = format(zonedStart, 'dd/MM/yyyy');
    const timeStartStr = format(zonedStart, 'HH:mm');
    const timeEndStr = format(zonedEnd, 'HH:mm');

    const addressLine = business.address ? `<p><strong>Dirección:</strong> ${business.address}</p>` : '';

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #000; margin-bottom: 20px;">Tu turno fue cancelado</h2>
        <p style="font-size: 16px;">Hola <strong>${customer.name}</strong>,</p>
        <p style="font-size: 16px; margin-bottom: 24px;">Te informamos que tu turno agendado en <strong>${business.name}</strong> ha sido cancelado.</p>

        <div style="background-color: #fff3f3; padding: 15px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #ff4444;">
          <h3 style="margin-top: 0; color: #cc0000;">Detalles del turno cancelado</h3>
          <p style="margin: 8px 0;"><strong>Servicio:</strong> ${booking.serviceName}</p>
          <p style="margin: 8px 0;"><strong>Profesional:</strong> ${professional.name}</p>
          <p style="margin: 8px 0;"><strong>Fecha:</strong> ${dateStr}</p>
          <p style="margin: 8px 0;"><strong>Horario:</strong> ${timeStartStr} a ${timeEndStr}</p>
          ${addressLine}
        </div>

        <p style="font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px;">
          Si considerás que esto es un error o necesitás reagendar, por favor comunicate directamente con el negocio.
        </p>
      </div>
    `;

    const result = await resend.emails.send({
      from: emailFrom,
      to: customer.email!,
      subject: `Tu turno fue cancelado — ${business.name}`,
      html: htmlTemplate
    });

    if (result.error) {
      console.error('Error desde Resend API (cancelación):', result.error);
      return { success: false, reason: 'provider_error', error: result.error };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Excepción al intentar enviar email de cancelación con Resend:', error);
    return { success: false, reason: 'exception', error };
  }
}

export async function sendBookingRescheduledEmail(bookingId: string, managementToken?: string, oldProfessionalName?: string) {
  if (!resendApiKey || !emailFrom || !resend) {
    console.warn('RESEND_API_KEY o EMAIL_FROM no configurados. Se omite el envío de email de reprogramación para la reserva:', bookingId);
    return { success: false, reason: 'missing_config' };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        business: true,
        professional: true
      }
    });

    if (!booking) {
      console.error('Booking no encontrada para notificar reprogramación:', bookingId);
      return { success: false, reason: 'booking_not_found' };
    }

    if (!booking.customer.email) {
      return { success: false, reason: 'no_customer_email' };
    }

    const { customer, business, professional } = booking;
    const zonedStart = toZonedTime(booking.startAt, business.timezone);
    const zonedEnd = toZonedTime(booking.endAt, business.timezone);

    const dateStr = format(zonedStart, 'dd/MM/yyyy');
    const timeStartStr = format(zonedStart, 'HH:mm');
    const timeEndStr = format(zonedEnd, 'HH:mm');

    const addressLine = business.address ? `<p><strong>Dirección:</strong> ${business.address}</p>` : '';

    let managementLinkHtml = '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (managementToken) {
      if (appUrl) {
        const cleanUrl = appUrl.replace(/\/$/, '');
        const tokenUrl = `${cleanUrl}/mi-turno/${managementToken}`;
        managementLinkHtml = `
          <div style="margin-top: 32px; text-align: center;">
            <a href="${tokenUrl}" style="background-color: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Gestionar mi turno</a>
          </div>
        `;
      }
    }

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #000; margin-bottom: 20px;">Tu turno fue reprogramado</h2>
        <p style="font-size: 16px;">Hola <strong>${customer.name}</strong>,</p>
        <p style="font-size: 16px; margin-bottom: 24px;">Te informamos que tu turno en <strong>${business.name}</strong> ha sido reprogramado. Aquí tienes los nuevos detalles:</p>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; color: #555;">Nuevos detalles del turno</h3>
          <p style="margin: 8px 0;"><strong>Servicio:</strong> ${booking.serviceName}</p>
          <p style="margin: 8px 0;"><strong>Profesional:</strong> ${professional.name}</p>
            ${oldProfessionalName ? `<p style="margin: 8px 0; color: #888; font-size: 14px;">(Antes con: ${oldProfessionalName})</p>` : ''}
          <p style="margin: 8px 0;"><strong>Fecha:</strong> ${dateStr}</p>
          <p style="margin: 8px 0;"><strong>Horario:</strong> ${timeStartStr} a ${timeEndStr}</p>
          ${addressLine}
        </div>

        ${managementLinkHtml}

        <p style="font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; margin-top: 24px;">
          Si tenés alguna duda, comunicate directamente con el negocio o usá el botón de gestión.
        </p>
      </div>
    `;

    const result = await resend.emails.send({
      from: emailFrom,
      to: customer.email!,
      subject: `Turno reprogramado en ${business.name}`,
      html: htmlTemplate
    });

    if (result.error) {
      console.error('Error desde Resend API:', result.error);
      return { success: false, reason: 'provider_error', error: result.error };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Excepción al intentar enviar email con Resend:', error);
    return { success: false, reason: 'exception', error };
  }
}

export async function sendBookingCreatedAdminEmail(bookingId: string) {
  if (!resendApiKey || !emailFrom || !resend) {
    console.warn('RESEND_API_KEY o EMAIL_FROM no configurados. Se omite email admin (creación) para:', bookingId);
    return { success: false, reason: 'missing_config' };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, business: true, professional: true }
    });

    if (!booking) return { success: false, reason: 'booking_not_found' };
    if (!booking.business.email) return { success: false, reason: 'no_business_email' };

    const { customer, business, professional } = booking;
    const zonedStart = toZonedTime(booking.startAt, business.timezone);
    const zonedEnd = toZonedTime(booking.endAt, business.timezone);

    const dateStr = format(zonedStart, 'dd/MM/yyyy');
    const timeStartStr = format(zonedStart, 'HH:mm');
    const timeEndStr = format(zonedEnd, 'HH:mm');

    let dashboardLinkHtml = '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      const cleanUrl = appUrl.replace(/\/$/, '');
      dashboardLinkHtml = `
        <div style="margin-top: 24px;">
          <a href="${cleanUrl}/dashboard/turnos" style="background-color: #111; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ver en Dashboard</a>
        </div>
      `;
    }

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #000; margin-bottom: 20px;">Nueva reserva recibida</h2>
        <p style="font-size: 16px;">Hola,</p>
        <p style="font-size: 16px; margin-bottom: 24px;">Tienes una nueva reserva agendada en <strong>${business.name}</strong>.</p>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; color: #555;">Detalles del turno</h3>
          <p style="margin: 8px 0;"><strong>Cliente:</strong> ${customer.name}</p>
          <p style="margin: 8px 0;"><strong>Servicio:</strong> ${booking.serviceName} (${booking.serviceDuration} min)</p>
          <p style="margin: 8px 0;"><strong>Profesional:</strong> ${professional.name}</p>
          <p style="margin: 8px 0;"><strong>Fecha:</strong> ${dateStr}</p>
          <p style="margin: 8px 0;"><strong>Horario:</strong> ${timeStartStr} a ${timeEndStr}</p>
          <p style="margin: 8px 0;"><strong>Precio:</strong> $${booking.servicePrice}</p>
          <p style="margin: 8px 0;"><strong>Estado:</strong> ${booking.status}</p>
        </div>

        ${dashboardLinkHtml}
      </div>
    `;

    const result = await resend.emails.send({
      from: emailFrom,
      to: business.email!,
      subject: `Nueva reserva: ${customer.name} - ${dateStr}`,
      html: htmlTemplate
    });

    if (result.error) return { success: false, reason: 'provider_error', error: result.error };
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Error enviando email admin de creación:', error);
    return { success: false, reason: 'exception', error };
  }
}

export async function sendBookingCancelledAdminEmail(bookingId: string) {
  if (!resendApiKey || !emailFrom || !resend) {
    console.warn('RESEND_API_KEY o EMAIL_FROM no configurados. Se omite email admin (cancelación) para:', bookingId);
    return { success: false, reason: 'missing_config' };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, business: true, professional: true }
    });

    if (!booking) return { success: false, reason: 'booking_not_found' };
    if (!booking.business.email) return { success: false, reason: 'no_business_email' };

    const { customer, business, professional } = booking;
    const zonedStart = toZonedTime(booking.startAt, business.timezone);
    const zonedEnd = toZonedTime(booking.endAt, business.timezone);

    const dateStr = format(zonedStart, 'dd/MM/yyyy');
    const timeStartStr = format(zonedStart, 'HH:mm');
    const timeEndStr = format(zonedEnd, 'HH:mm');

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #000; margin-bottom: 20px;">Una reserva ha sido cancelada</h2>
        <p style="font-size: 16px;">Hola,</p>
        <p style="font-size: 16px; margin-bottom: 24px;">El cliente <strong>${customer.name}</strong> ha cancelado su turno.</p>

        <div style="background-color: #fff3f3; padding: 15px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #ff4444;">
          <h3 style="margin-top: 0; color: #cc0000;">Detalles de la cancelación</h3>
          <p style="margin: 8px 0;"><strong>Cliente:</strong> ${customer.name}</p>
          <p style="margin: 8px 0;"><strong>Servicio:</strong> ${booking.serviceName} (${booking.serviceDuration} min)</p>
          <p style="margin: 8px 0;"><strong>Profesional:</strong> ${professional.name}</p>
          <p style="margin: 8px 0;"><strong>Fecha:</strong> ${dateStr}</p>
          <p style="margin: 8px 0;"><strong>Horario:</strong> ${timeStartStr} a ${timeEndStr}</p>
          <p style="margin: 8px 0;"><strong>Precio:</strong> $${booking.servicePrice}</p>
          <p style="margin: 8px 0;"><strong>Estado:</strong> ${booking.status}</p>
        </div>
      </div>
    `;

    const result = await resend.emails.send({
      from: emailFrom,
      to: business.email!,
      subject: `Reserva cancelada: ${customer.name} - ${dateStr}`,
      html: htmlTemplate
    });

    if (result.error) return { success: false, reason: 'provider_error', error: result.error };
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Error enviando email admin de cancelación:', error);
    return { success: false, reason: 'exception', error };
  }
}

export async function sendBookingRescheduledAdminEmail(
  bookingId: string,
  oldStartAt: Date,
  oldEndAt: Date,
  oldProfessionalName?: string
) {
  if (!resendApiKey || !emailFrom || !resend) {
    console.warn('RESEND_API_KEY o EMAIL_FROM no configurados. Se omite email admin (reprogramación) para:', bookingId);
    return { success: false, reason: 'missing_config' };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, business: true, professional: true }
    });

    if (!booking) return { success: false, reason: 'booking_not_found' };
    if (!booking.business.email) return { success: false, reason: 'no_business_email' };

    const { customer, business, professional } = booking;
    const zonedStart = toZonedTime(booking.startAt, business.timezone);
    const zonedEnd = toZonedTime(booking.endAt, business.timezone);

    const newDateStr = format(zonedStart, 'dd/MM/yyyy');
    const newTimeStartStr = format(zonedStart, 'HH:mm');
    const newTimeEndStr = format(zonedEnd, 'HH:mm');

    const zonedOldStart = toZonedTime(oldStartAt, business.timezone);
    const zonedOldEnd = toZonedTime(oldEndAt, business.timezone);

    const oldDateStr = format(zonedOldStart, 'dd/MM/yyyy');
    const oldTimeStartStr = format(zonedOldStart, 'HH:mm');
    const oldTimeEndStr = format(zonedOldEnd, 'HH:mm');

    let dashboardLinkHtml = '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      const cleanUrl = appUrl.replace(/\/$/, '');
      dashboardLinkHtml = `
        <div style="margin-top: 24px;">
          <a href="${cleanUrl}/dashboard/turnos" style="background-color: #111; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ver en Dashboard</a>
        </div>
      `;
    }

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #000; margin-bottom: 20px;">Una reserva ha sido reprogramada</h2>
        <p style="font-size: 16px;">Hola,</p>
        <p style="font-size: 16px; margin-bottom: 24px;">El cliente <strong>${customer.name}</strong> ha reprogramado su turno.</p>

        <div style="background-color: #f0f7ff; padding: 15px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #0066cc;">
          <h3 style="margin-top: 0; color: #0066cc;">Nuevos detalles del turno</h3>
          <p style="margin: 8px 0;"><strong>Cliente:</strong> ${customer.name}</p>
          <p style="margin: 8px 0;"><strong>Servicio:</strong> ${booking.serviceName} (${booking.serviceDuration} min)</p>
          <p style="margin: 8px 0;"><strong>Profesional:</strong> ${professional.name}</p>
            ${oldProfessionalName ? `<p style="margin: 8px 0; color: #666; font-size: 14px;">(Profesional anterior: ${oldProfessionalName})</p>` : ''}
          <p style="margin: 8px 0;"><strong>Fecha anterior:</strong> ${oldDateStr} de ${oldTimeStartStr} a ${oldTimeEndStr}</p>
          <p style="margin: 8px 0; font-weight: bold;"><strong>Nueva Fecha:</strong> ${newDateStr} de ${newTimeStartStr} a ${newTimeEndStr}</p>
          <p style="margin: 8px 0;"><strong>Precio:</strong> $${booking.servicePrice}</p>
          <p style="margin: 8px 0;"><strong>Estado:</strong> ${booking.status}</p>
        </div>

        ${dashboardLinkHtml}
      </div>
    `;

    const result = await resend.emails.send({
      from: emailFrom,
      to: business.email!,
      subject: `Reserva reprogramada: ${customer.name} - ${newDateStr}`,
      html: htmlTemplate
    });

    if (result.error) return { success: false, reason: 'provider_error', error: result.error };
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Error enviando email admin de reprogramación:', error);
    return { success: false, reason: 'exception', error };
  }
}
export async function sendTeamInvitationEmail(to: string, businessName: string, role: string, token: string) {
  if (!resend || !emailFrom || !process.env.NEXT_PUBLIC_APP_URL) {
    console.warn('RESEND_API_KEY, EMAIL_FROM o NEXT_PUBLIC_APP_URL no configurados. Se omite email de invitacion para:', to);
    return { success: false, reason: 'missing_config' };
  }

  try {
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitacion/${token}`;

    const result = await resend.emails.send({
      from: `Turnos SaaS <${emailFrom}>`,
      to,
      subject: `Invitacion para unirte a ${businessName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Has sido invitado a unirte a ${businessName}</h2>
          <p>Se te ha invitado a unirte al equipo con el rol de <strong>${role}</strong>.</p>
          <p>La invitacion expira en 72 horas.</p>
          <p>Haz clic en el siguiente enlace para aceptar la invitacion y definir tu contraseña:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        </div>
      `
    });

    if (result.error) return { success: false, reason: 'provider_error', error: result.error };
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Error enviando email de invitacion:', error);
    return { success: false, reason: 'exception', error };
  }
}
export async function sendPasswordResetEmail(to: string, userName: string | null, token: string) {
  if (!resend || !emailFrom || !process.env.NEXT_PUBLIC_APP_URL) {
    console.warn('RESEND_API_KEY, EMAIL_FROM o NEXT_PUBLIC_APP_URL no configurados. Se omite email de recuperacion para:', to);
    return { success: false, reason: 'missing_config' };
  }

  try {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/restablecer/${token}`;
    const displayName = userName || 'Usuario';

    const result = await resend.emails.send({
      from: `Turnos SaaS <${emailFrom}>`,
      to,
      subject: `Recuperación de contraseña`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hola, ${displayName}</h2>
          <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p>Este enlace expirará en 2 horas.</p>
          <p>Haz clic en el siguiente enlace para definir una nueva contraseña:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      `
    });

    if (result.error) return { success: false, reason: 'provider_error', error: result.error };
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Error enviando email de recuperacion:', error);
    return { success: false, reason: 'exception', error };
  }
}
