import twilio from "twilio";
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

async function createMessage(phoneNumber:string,verificationCode:string) {
  const message = await client.messages.create({
    body: `Your verification code is ${verificationCode}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });

  console.log(message.body);
}

export default createMessage;