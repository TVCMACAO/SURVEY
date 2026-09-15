import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Soft gradient blobs matching the web survey-ui background.
class AppAtmosphere extends StatelessWidget {
  final Widget child;
  final Color? backgroundColor;

  const AppAtmosphere({
    super.key,
    required this.child,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final bg = backgroundColor ?? AppColors.scaffoldBg;
    return ColoredBox(
      color: bg,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            top: -80,
            left: -60,
            child: _Blob(color: AppColors.blobPurple.withValues(alpha: 0.45), size: 260),
          ),
          Positioned(
            top: 120,
            right: -80,
            child: _Blob(color: AppColors.blobBlue.withValues(alpha: 0.4), size: 220),
          ),
          Positioned(
            bottom: -60,
            left: 40,
            child: _Blob(color: AppColors.blobPink.withValues(alpha: 0.35), size: 280),
          ),
          child,
        ],
      ),
    );
  }
}

class _Blob extends StatelessWidget {
  final Color color;
  final double size;

  const _Blob({required this.color, required this.size});

  @override
  Widget build(BuildContext context) {
    return ImageFiltered(
      imageFilter: ImageFilter.blur(sigmaX: 48, sigmaY: 48),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
        ),
      ),
    );
  }
}

/// Scaffold with atmosphere background and optional glass app bar area.
class AtmosphereScaffold extends StatelessWidget {
  final PreferredSizeWidget? appBar;
  final Widget? body;
  final Widget? floatingActionButton;
  final Color? backgroundColor;
  final bool extendBodyBehindAppBar;

  const AtmosphereScaffold({
    super.key,
    this.appBar,
    this.body,
    this.floatingActionButton,
    this.backgroundColor,
    this.extendBodyBehindAppBar = false,
  });

  @override
  Widget build(BuildContext context) {
    return AppAtmosphere(
      backgroundColor: backgroundColor,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        extendBodyBehindAppBar: extendBodyBehindAppBar,
        appBar: appBar,
        body: body,
        floatingActionButton: floatingActionButton,
      ),
    );
  }
}

/// Frosted header strip used instead of a flat Material AppBar.
class GlassHeader extends StatelessWidget implements PreferredSizeWidget {
  final Widget child;
  final double height;
  final double topInset;

  const GlassHeader({
    super.key,
    required this.child,
    this.height = 56,
    this.topInset = 0,
  });

  @override
  Size get preferredSize => Size.fromHeight(height + topInset);

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.55),
            border: Border(
              bottom: BorderSide(color: Colors.white.withValues(alpha: 0.45)),
            ),
          ),
          padding: EdgeInsets.only(top: topInset),
          child: SizedBox(
            height: height,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

class GlassPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final double radius;
  final bool showSideBar;

  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.color,
    this.radius = 16,
    this.showSideBar = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: color ?? AppColors.glassWhite,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: Colors.white.withValues(alpha: 0.7)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: showSideBar
          ? IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(width: 4, color: AppColors.sideBar),
                  Expanded(
                    child: Padding(padding: padding, child: child),
                  ),
                ],
              ),
            )
          : Padding(padding: padding, child: child),
    );
  }
}
