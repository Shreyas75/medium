import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { sign } from 'hono/jwt';
import { signinInput, signupInput } from "@shrey24/medium-common";
export const userRouter = new Hono();
userRouter.post('/signup', async (c) => {
    const body = await c.req.json();
    const { success } = signupInput.safeParse(body);
    if (!success) {
        c.status(411);
        return c.json({
            message: "Improper Inputs!"
        });
    }
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    try {
        const user = await prisma.user.create({
            data: {
                email: body.email,
                password: body.password,
                name: body.name
            }
        });
        const token = await sign({ id: user.id }, c.env.JWT_SECRET);
        return c.json({
            message: "User SignedUp Successfully.",
            jwt: token
        });
    }
    catch (e) {
        return c.status(403);
    }
});
userRouter.post('/signin', async (c) => {
    const body = await c.req.json();
    const { success } = signinInput.safeParse(body);
    if (!success) {
        c.status(411);
        return c.json({
            message: "Improper Inputs!"
        });
    }
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    try {
        const user = await prisma.user.findUnique({
            where: {
                email: body.email
            }
        });
        if (!user) {
            c.status(403);
            return c.json({ error: "User not found!" });
        }
        const token = await sign({ id: user.id }, c.env.JWT_SECRET);
        return c.json({
            message: "User SignedIn Successfully.",
            jwt: token
        });
    }
    catch (e) {
        return c.status(403);
    }
});
