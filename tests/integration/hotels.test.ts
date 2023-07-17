import supertest from 'supertest';
import * as jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import faker from '@faker-js/faker';
import {
  createEnrollmentWithAddress,
  createHotels,
  createSession,
  createTicket,
  createTicketTypeInPersonWithHotel,
  createTicketTypeInPersonWithoutHotel,
  createTicketTypeRemoteWithHotel,
  createUser,
} from '../factories';
import { cleanDb, generateValidToken } from '../helpers';
import app, { init } from '@/app';

beforeAll(async () => {
  init();
});

beforeEach(async () => {
  cleanDb();
});

const server = supertest(app);

describe('GET /hotels', () => {
  it('should respond with status 401 if no token is given', async () => {
    const result = await server.get('/hotels');

    expect(result.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if given token is not valid', async () => {
    const token = faker.lorem.word;

    const result = await server.get('/hotels').set('Authorization', `Bearer ${token}`);

    expect(result.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if there is no session fot the given token', async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const result = await server.get('/hotels').set('Authorization', `Bearer ${token}`);

    expect(result.status).toBe(httpStatus.UNAUTHORIZED);
  });
});

describe('GET /hotels when token is valid', () => {
  it('should return array of hotels and status code 200 if meets all the business rules', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    await createSession(token);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeInPersonWithHotel();
    await createTicket(enrollment.id, ticketType.id, 'PAID');
    await createHotels();

    const result = await server.get('/hotels').set('Authorization', `Bearer ${token}`);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          image: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      ]),
    );
  });

  it('should respond with status code 402 if ticket does not inscludes hotel', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    await createSession(token);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeInPersonWithoutHotel();
    await createTicket(enrollment.id, ticketType.id, 'PAID');
    await createHotels();
    const result = await server.get('/hotels').set('Authorization', `Bearer ${token}`);

    expect(result.status).toBe(402);
  });

  it('should respond with status code 402 if ticket status is different from PAID', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    await createSession(token);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeInPersonWithHotel();
    await createTicket(enrollment.id, ticketType.id, 'RESERVED');
    await createHotels();
    const result = await server.get('/hotels').set('Authorization', `Bearer ${token}`);

    expect(result.status).toBe(402);
  });

  it('should respond with status code 402 if ticketType isRemote is true', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    await createSession(token);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeRemoteWithHotel();
    await createTicket(enrollment.id, ticketType.id, 'PAID');
    await createHotels();
    const result = await server.get('/hotels').set('Authorization', `Bearer ${token}`);

    expect(result.status).toBe(402);
  });

  it('should respond with status code 404 if there is hotel', async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    await createSession(token);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeInPersonWithHotel();
    await createTicket(enrollment.id, ticketType.id, 'PAID');

    const result = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
    console.log(result.body);

    expect(result.status).toBe(404);
  });
});
