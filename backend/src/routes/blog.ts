import {Hono} from "hono";

import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign, verify } from 'hono/jwt';
import { createBlogInput, CreateBlogInput, updateBlogInput } from "@shrey24/medium-common";

export const blogRouter = new Hono<{
	Bindings: {
		DATABASE_URL: string;
        JWT_SECRET: string;
	},
    Variables: {
        userId: string;
    }
}>();


blogRouter.use("/*", async (c,next) => {
    const authHeader = c.req.header("authorization") || "";
    if (!authHeader) {
		c.status(401);
		return c.json({ error: "unauthorized" });
	}
    const token = authHeader?.split(" ")[1];
    const user = await verify(token, c.env.JWT_SECRET);
    if (!user) {
		c.status(401);
		return c.json({ error: "unauthorized" });
	}
    //@ts-ignore
    c.set("userId", user.id)
    await next();
})



blogRouter.post('/', async(c) => {
    const body = await c.req.json();
    const {success} =  createBlogInput.safeParse(body);
    if(!success){
        c.status(411);
        return c.json({
            message: "Improper Inputs!"
        })
    }
    const authorId = c.get("userId");
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    

    const blog = await prisma.blog.create({
        data: {
            title: body.title,
            content: body.content,
            authorId: authorId
        }
    })

    return c.json({
        id: blog.id
    })
})
  
blogRouter.put('/', async(c) => {
    const body = await c.req.json();
    const {success} =  updateBlogInput.safeParse(body);
    if(!success){
        c.status(411);
        return c.json({
            message: "Improper Inputs!"
        })
    }
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())


    const blog = await prisma.blog.update({
        where: {
            id: body.id
        },
        data: {
            title: body.title,
            content: body.content
        }
    })
    return c.json({
        id: blog.id
    })
})

//Todo: Add pagination  
blogRouter.get('/bulk', async(c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const blogs = await prisma.blog.findMany({
        select: {
            content: true,
            title: true,
            id: true,
            author: {
                select: {
                    name: true
                }
            }
        }
    })
    return c.json({
        blogs
    })
})
  
blogRouter.get('/:id', async (c) => {
    const id = c.req.param("id");
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())


    try {
        const blog = await prisma.blog.findFirst({
            where: {
                id: id
            },
            select: {
                id: true,
                title: true,
                content: true,
                author: {
                    select: {
                        name: true
                    }
                }
            }
        })
        return c.json({
            blog
        })
    } catch (e) {
        c.status(403)
        return c.json({
            error: "Error while fetching the blog post"
        });
    }
    
})


