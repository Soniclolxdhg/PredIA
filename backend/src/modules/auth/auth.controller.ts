import {
  Controller,
  Post,
  Put,
  Patch,
  Body,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  async registro(@Body() registroDto: RegistroDto) {
    return this.authService.registrarUsuario(registroDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  obtenerPerfil(@Request() req: { user: any }) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('usuarios')
  async listarUsuarios(
    @Query('rol') rol?: RolUsuario,
    @Query('activo') activo?: string,
  ) {
    const activoBool = activo !== undefined ? activo === 'true' : undefined;
    return this.authService.listarUsuarios(rol, activoBool);
  }

  @UseGuards(JwtAuthGuard)
  @Get('usuarios/:id')
  async obtenerUsuarioPorId(@Param('id', ParseIntPipe) id: number) {
    return this.authService.obtenerUsuarioPorId(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('usuarios/:id')
  async actualizarUsuarioPut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.authService.actualizarUsuario(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('usuarios/:id')
  async actualizarUsuarioPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.authService.actualizarUsuario(id, dto);
  }
}

