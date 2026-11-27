import type { Request, Response } from 'express'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.ts'
import { externalReferenceInputSchema } from '../validators/common.validator.ts'

const bootstrapAdminSchema = externalReferenceInputSchema.extend({
  email: z.string().trim().email().max(180),
  fullName: z.string().trim().min(2).max(160),
  password: z.string().min(8).max(128),
  passcode: z.string().max(128).optional(),
})

const loginSchema = z.object({
  email: z.string().trim().email().max(180),
  password: z.string().min(1).max(128),
})

const issueApiKeySchema = z.object({
  name: z.string().trim().min(2).max(140),
  externalSystem: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_.-]*$/),
  roleId: z.string().trim().min(1).max(80),
  environment: z.enum(['production', 'sandbox']).default('production'),
  rateLimitPerMin: z.number().int().min(1).max(100000).optional(),
  externalId: z.string().trim().min(1).max(120).nullable().optional(),
})

export class AuthController {
  private readonly authService = new AuthService()

  bootstrapStatus = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.authService.getBootstrapStatus())
  }

  bootstrapAdmin = async (req: Request, res: Response): Promise<void> => {
    const body = bootstrapAdminSchema.parse(req.body)
    const result = await this.authService.bootstrapAdmin(body)
    res.status(201).json(result)
  }

  login = async (req: Request, res: Response): Promise<void> => {
    const body = loginSchema.parse(req.body)
    const result = await this.authService.login(body)
    res.json(result)
  }

  me = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.authService.getCurrentContext(req.tenantContext!))
  }

  issueApiKey = async (req: Request, res: Response): Promise<void> => {
    const body = issueApiKeySchema.parse(req.body)
    const created = await this.authService.issueApiKey(req.tenantContext!, body)
    res.status(201).json(created)
  }
}
