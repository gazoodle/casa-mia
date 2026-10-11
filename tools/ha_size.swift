// Size the Mac Home Assistant app's window for the docs' screenshots: shows its size
// live, against the target, until it's spot on (drag the window's corner). The docs'
// screenshots are 1600 x 1188, the 1900 x 1411 window scaled down.
//
//     swift tools/ha_size.swift            # target 1900 x 1411
//     swift tools/ha_size.swift 1600 1200  # another target
//
// Ctrl-C to stop.

import CoreGraphics
import Foundation

let args = CommandLine.arguments.dropFirst().compactMap { Int($0) }
let (tw, th) = args.count == 2 ? (args[0], args[1]) : (1900, 1411)

while true {
  let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
  let app = windows.first {
    ($0["kCGWindowOwnerName"] as? String) == "Home Assistant" && ($0["kCGWindowLayer"] as? Int) == 0
  }
  if let b = app?["kCGWindowBounds"] as? [String: Double] {
    let (w, h) = (Int(b["Width"] ?? 0), Int(b["Height"] ?? 0))
    let verdict = w == tw && h == th ? "✅ SPOT ON" : "off by \(w - tw), \(h - th)"
    print("\r\(w) x \(h)   target \(tw) x \(th)   \(verdict)          ", terminator: "")
  } else {
    print("\rNo Home Assistant window on screen                    ", terminator: "")
  }
  fflush(stdout)
  usleep(100_000)
}
