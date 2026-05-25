import {
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { secureMediaMulterOptions } from '../media/media-security';
import { UserProfileService } from './user-profile.service';

@Controller('user-profile')
@UseGuards(PanelJwtAuthGuard)
export class UserProfileController {
  constructor(private readonly service: UserProfileService) {}

  @Get('photo')
  async getPhoto(@Req() req: Request) {
    const photoUrl = await this.service.getPhotoUrl(req.userPayload!.id);
    return { photoUrl };
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('photo', secureMediaMulterOptions))
  async uploadPhoto(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const photoUrl = await this.service.uploadPhoto(req.userPayload!.id, file);
    return { photoUrl };
  }

  @Delete('photo')
  async removePhoto(@Req() req: Request) {
    await this.service.removePhoto(req.userPayload!.id);
    return { ok: true };
  }
}
