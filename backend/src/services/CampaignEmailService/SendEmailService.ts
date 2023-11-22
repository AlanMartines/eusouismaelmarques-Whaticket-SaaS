import AppError from "../../errors/AppError";
import Email from "../../models/Email";
import SignEmail from "../../models/SignEmail";
import nodemailer from "nodemailer";
import TemplateEmail from "../../models/TemplateEmail";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";
import User from "../../models/User";
import crypto from 'crypto';

interface EmailVerificationResult {
  success: boolean;
  message?: string;
}




const SendEmail = async (id, companyId): Promise<EmailVerificationResult> => {
  const record = await Email.findByPk(id, {
    include: [
      {
        model: ContactList,
        as: "contactList",
        attributes: ["id", "name"],
        include: [
          {
            model: ContactListItem,
            as: "contacts",
            attributes: ["id", "name", "email"],
          },
        ],
      },
      {
        model: SignEmail,
        as: "dkim",
        attributes: ["id", "dkim", "privateKey", "publicKey"],
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"],
      },
      {
        model: TemplateEmail,
        as: "template",
        attributes: ["id", "name", "html"],
      },
    ],
  });

  if (!record) {
    throw new AppError("ERR_NO_EMAIL_FOUND", 404);
  }

  const senderEmailParts = record.user.email.split('@');
  const senderDomain = senderEmailParts.length === 2 ? senderEmailParts[1] : null;

  const dkimOptions = {
    privateKey: record.dkim.privateKey,
    keySelector: "mail",
    domainName: senderDomain,
  };

  console.log(dkimOptions);

  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'gustavo.ribeiro01001@gmail.com',
      pass: 'nszf pxvp yecr dcmc',
    },
  });
  

  const contactsEmails = record.contactList.contacts.map(contact => contact.email);

  if (contactsEmails.length === 0) {
    throw new AppError("ERR_NO_CONTACTS_FOUND", 500);
  }

  const emailOptions = {
    from: record.user.email,
    to: contactsEmails.join(', '),
    subject: record.title,
    html: record.template.html,
  };

  try {
    console.log("Enviando!");
    await transporter.sendMail(emailOptions);
    console.log("E-mail enviado com sucesso!");
  } catch (error) {
    console.error("Erro ao enviar o email:", error);
    throw new AppError("ERR_EMAIL_SENDING_FAILED", 500);
  }

  return { success: true, message: 'E-mail enviado com sucesso' };
};

export default SendEmail;