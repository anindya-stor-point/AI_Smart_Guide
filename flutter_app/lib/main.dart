import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:screen_capturer/screen_capturer.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MaterialApp(home: HomeScreen()));
}

// ওভারলে এন্ট্রি পয়েন্ট (এটি আলাদা উইন্ডোতে রান করবে)
@pragma("vm:entry-point")
void overlayMain() {
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: FloatingGuideOverlay(),
  ));
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool isRunning = false;
  Timer? _timer;
  final FlutterTts _tts = FlutterTts();
  
  // আপনার জেমিনি এপিআই কী এখানে দিন
  final String apiKey = "AIzaSyCb_jOE_RIDEmY59HDAqpHyb_CUO5viCs0";

  @override
  void initState() {
    super.initState();
    _initTTS();
  }

  void _initTTS() async {
    await _tts.setLanguage("bn-BD");
    await _tts.setSpeechRate(0.5);
  }

  Future<void> _startLiveGuide() async {
    if (isRunning) return;

    // Android 13+ Notification Permission
    if (Platform.isAndroid) {
      final status = await Permission.notification.request();
      if (status.isDenied) {
        // Handle denied permission
        return;
      }
    }

    // ওভারলে পারমিশন চেক
    if (!await FlutterOverlayWindow.isPermissionGranted()) {
      await FlutterOverlayWindow.requestPermission();
      return;
    }

    setState(() => isRunning = true);
    
    // ওভারলে উইন্ডো ওপেন করুন
    await FlutterOverlayWindow.showOverlay(
      enableDrag: true,
      overlayTitle: "Bengali Guide",
      alignment: OverlayAlignment.centerLeft,
      visibility: NotificationVisibility.visibilityPublic,
    );

    // প্রতি ২ সেকেন্ড পর পর স্ক্রিন ক্যাপচার এবং অ্যানালাইসিস
    _timer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      await _captureAndAnalyze();
    });
  }

  Future<void> _captureAndAnalyze() async {
    try {
      final directory = await getTemporaryDirectory();
      final String imagePath = '${directory.path}/screenshot.png';
      
      // স্ক্রিন ক্যাপচার
      final CapturedData? capturedData = await ScreenCapturer.instance.capture(
        imagePath: imagePath,
        silent: true,
      );

      if (capturedData == null) return;

      final File imageFile = File(imagePath);
      final bytes = await imageFile.readAsBytes();

      // জেমিনি এপিআই কল
      final model = GenerativeModel(model: 'gemini-1.5-flash', apiKey: apiKey);
      final content = [
        Content.multi([
          TextPart("Analyze this screen. Identify the app and the next action. Return JSON: {appName, instructions, voiceScript, x, y}"),
          DataPart('image/png', bytes),
        ])
      ];

      final response = await model.generateContent(content);
      final data = jsonDecode(response.text!);

      // ভয়েস গাইডেন্স
      await _tts.speak(data['voiceScript']);

      // ওভারলে-তে ডাটা পাঠান (তীর দেখানোর জন্য)
      await FlutterOverlayWindow.shareData(data);

    } catch (e) {
      print("Error: $e");
    }
  }

  void _stopLiveGuide() {
    _timer?.cancel();
    FlutterOverlayWindow.closeOverlay();
    setState(() => isRunning = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // App Branding
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.blue[600],
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.blue.withOpacity(0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    )
                  ],
                ),
                child: const Icon(Icons.smartphone, size: 50, color: Colors.white),
              ),
              const SizedBox(height: 32),
              const Text(
                "বাংলা অ্যাপ গাইড",
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
              const SizedBox(height: 12),
              const Text(
                "লাইভ ইন্টারঅ্যাক্টিভ গাইড শুরু করতে নিচের বাটনে ক্লিক করুন",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, color: Colors.black54),
              ),
              const Spacer(),
              // The Main Big Button
              GestureDetector(
                onTap: isRunning ? _stopLiveGuide : _startLiveGuide,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: double.infinity,
                  height: 80,
                  decoration: BoxDecoration(
                    color: isRunning ? Colors.red[600] : Colors.blue[600],
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: (isRunning ? Colors.red : Colors.blue).withOpacity(0.4),
                        blurRadius: 15,
                        offset: const Offset(0, 8),
                      )
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(isRunning ? Icons.stop_circle : Icons.play_circle_filled, color: Colors.white, size: 32),
                      const SizedBox(width: 12),
                      Text(
                        isRunning ? "STOP LIVE GUIDE" : "START LIVE GUIDE",
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

// ফ্লোটিং ওভারলে উইন্ডো (এটি অন্য অ্যাপের ওপর ভাসবে)
class FloatingGuideOverlay extends StatefulWidget {
  const FloatingGuideOverlay({super.key});

  @override
  State<FloatingGuideOverlay> createState() => _FloatingGuideOverlayState();
}

class _FloatingGuideOverlayState extends State<FloatingGuideOverlay> {
  Map<String, dynamic>? _guideData;

  @override
  void initState() {
    super.initState();
    // মেইন অ্যাপ থেকে ডাটা রিসিভ করা
    FlutterOverlayWindow.overlayListener.listen((data) {
      setState(() {
        _guideData = data;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Stack(
        children: [
          if (_guideData != null)
            Positioned(
              left: (_guideData!['x'] as num).toDouble() * MediaQuery.of(context).size.width / 100,
              top: (_guideData!['y'] as num).toDouble() * MediaQuery.of(context).size.height / 100,
              child: Column(
                children: [
                  const Icon(Icons.arrow_downward, color: Colors.red, size: 50),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(8)),
                    child: Text(_guideData!['instructions'], style: const TextStyle(color: Colors.white, fontSize: 12)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
// Final Sync Trigger - Force Sync
