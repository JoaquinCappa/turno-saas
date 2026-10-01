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
