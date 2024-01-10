import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";

interface Request {
  body: string;
  sendAt: string;
  contactId: number | string;
  companyId: number | string;
  geventId: string;
  userId?: number | string;
}

const CreateService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  geventId,
  userId
}: Request): Promise<Schedule> => {
  const schema = Yup.object().shape({
    body: Yup.string().required().min(5),
    sendAt: Yup.string().required()
  });

  try {
    await schema.validate({ body, sendAt });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const schedule = await Schedule.create(
    {
      body,
      sendAt,
      contactId,
      companyId,
      geventId,
      userId,
      status: 'PENDENTE'
    }
  );

  await schedule.reload();

  return schedule;
};

export default CreateService;
