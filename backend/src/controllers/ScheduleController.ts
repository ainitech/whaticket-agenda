import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import AppError from "../errors/AppError";

import CreateService from "../services/ScheduleServices/CreateService";
import ListService from "../services/ScheduleServices/ListService";
import UpdateService from "../services/ScheduleServices/UpdateService";
import ShowService from "../services/ScheduleServices/ShowService";
import DeleteService from "../services/ScheduleServices/DeleteService";

const { google } = require('googleapis');

const CREDENTIALS = JSON.parse(process.env.GCREDENTIALS);
const calendarId = process.env.CALENDARID;

const SCOPES = 'https://www.googleapis.com/auth/calendar';
const calendar = google.calendar({version: "v3"});

const auth = new google.auth.JWT(
  CREDENTIALS.client_email,
  null,
  CREDENTIALS.private_key,
  SCOPES
);

type IndexQuery = {
  searchParam?: string;
  contactId?: number | string;
  userId?: number | string;
  pageNumber?: string | number;
};

const insertEvent = async (event) => {

  try {
      let response = await calendar.events.insert({
          auth: auth,
          calendarId: calendarId,
          resource: event
      });
  
      if (response['status'] == 200 && response['statusText'] === 'OK') {
          return response.data.id;
      } else {
          return 0;
      }
  } catch (error) {
      console.log(`Error at insertEvent --> ${error}`);
      return 0;
  }
};

const updateEvent = async (eventId, event) => {

  try {
      let response = await calendar.events.update({
          auth: auth,
          eventId: eventId,
          calendarId: calendarId,
          resource: event
      });
  
      if (response['status'] == 200 && response['statusText'] === 'OK') {
          return response.data.id;
      } else {
          return 0;
      }
  } catch (error) {
      console.log(`Error at update Event --> ${error}`);
      return 0;
  }
};


export const index = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, userId, pageNumber, searchParam } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { schedules, count, hasMore } = await ListService({
    searchParam,
    contactId,
    userId,
    pageNumber,
    companyId
  });

  return res.json({ schedules, count, hasMore });
};

/*let eventt = {
  'summary': 'Reunião do Rojudo',
  'description': 'Discussão sobre o andamento do projeto',
  'start': {
      'dateTime': '2024-01-03T18:00:00.000+05:30',
      'timeZone': 'Asia/Kolkata'
  },
  'end': {
      'dateTime': '2024-01-03T18:00:00.000+05:30',
      'timeZone': 'Asia/Kolkata'
  }
};*/

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    body,
    sendAt,
    contactId,
    userId
  } = req.body;
  const { companyId } = req.user;

  let eventt = {
    'summary': 'Reunião do Rojudo',
    'description': 'Discussão sobre o andamento do projeto',
    'start': {
        'dateTime': sendAt,
        'timeZone': 'Asia/Kolkata'
    },
    'end': {
        'dateTime': sendAt,
        'timeZone': 'Asia/Kolkata'
    }
  };
  const eventId = await insertEvent(eventt);

  const scheduleData = {
    body,
    sendAt,
    contactId,
    companyId,
    userId,
    geventId: eventId // Certifique-se de que o nome do parâmetro esteja correto
  };

  const schedule = await CreateService(scheduleData);

  const io = getIO();
  io.emit("schedule", {
    action: "create",
    schedule
  });

  console.log('evento inserido com sucesso!!!!!!!');
  console.log('Id do evento', eventId);
  console.log('ScheduleData', scheduleData);
  return res.status(200).json(schedule);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId } = req.user;

  const schedule = await ShowService(scheduleId, companyId);

  return res.status(200).json(schedule);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { scheduleId } = req.params;
  const scheduleData = req.body;
  console.log('update Caraii');
  console.log('scheduleData:',scheduleData)
  const { companyId } = req.user;

  const schedule = await UpdateService({ scheduleData, id: scheduleId, companyId });

  const io = getIO();
  io.emit("schedule", {
    action: "update",
    schedule
  });

  return res.status(200).json(schedule);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId } = req.user;

  await DeleteService(scheduleId, companyId);

  const io = getIO();
  io.emit("schedule", {
    action: "delete",
    scheduleId
  });

  return res.status(200).json({ message: "Schedule deleted" });
};
