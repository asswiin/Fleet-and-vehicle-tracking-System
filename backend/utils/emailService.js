const nodemailer = require("nodemailer");

const sendCredentialsEmail = async (email, name, password, role = "Staff Member") => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "aswinhareesh1991@gmail.com", // Replace with your email
        pass: "jydr zizx dvyv ntye",     // Replace with your App Password
      },
      // 👇 ADD THIS BLOCK TO FIX THE CERTIFICATE ERROR
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: '"Logistics Admin" <no-reply@logistics.com>',
      to: email,
      subject: `Your ${role === 'driver' ? 'Driver' : 'Manager'} Account Credentials`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello ${name},</h2>
          <p>You have been added as a ${role === 'driver' ? 'driver' : 'Manager'} to the Logistics Tracking System.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          <p>Please login and change your password immediately.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to ${email}`);
  } catch (error) {
    console.error("Email sending failed:", error);
  }
};

const sendTrackingEmail = async (email, recipientName, trackingId) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "aswinhareesh1991@gmail.com",
        pass: "jydr zizx dvyv ntye",
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Use environment variable for frontend URL, default to Vercel production or local dev
    const frontendUrl = process.env.FRONTEND_URL || "https://userapp-seven.vercel.app";
    const trackingLink = `${frontendUrl}/?trackingId=${trackingId}`;

    const mailOptions = {
      from: '"Logistics Tracking" <no-reply@logistics.com>',
      to: email,
      subject: `Your Parcel ${trackingId} is Out for Delivery!`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Parcel Dispatched</h1>
          </div>
          <div style="padding: 30px; background-color: white;">
            <p style="font-size: 16px; color: #1e293b;">Hello <strong>${recipientName}</strong>,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Good news! Your parcel with ID <strong>${trackingId}</strong> has been picked up and the journey has started.
            </p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${trackingLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Track Your Parcel Live</a>
            </div>
            <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
              If the button above doesn't work, copy and paste this link into your browser:<br>
              <a href="${trackingLink}" style="color: #2563eb;">${trackingLink}</a>
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">&copy; 2026 Fleet & Vehicle Tracking System. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Tracking email successfully sent to ${email}`);
  } catch (error) {
    console.error("Tracking email sending failed:", error);
  }
};

module.exports = { sendCredentialsEmail, sendTrackingEmail };