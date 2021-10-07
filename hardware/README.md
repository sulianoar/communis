# Communis - Hardware

<p align="center">
  <img src="https://github.com/sulianoar/communis/blob/main/Hardware/pictures/front-close-min.jpg" width="450" title="front-close-min">
    <img src="https://github.com/sulianoar/communis/blob/main/Hardware/pictures/front-open-min.jpg" width="450" title="front-open-min">
  <img src="https://github.com/sulianoar/communis/blob/main/Hardware/pictures/up-min.jpg" width="450" alt="up">
  <img src="https://github.com/sulianoar/communis/blob/main/Hardware/pictures/back-min.jpg" width="450" alt="back">
</p>

All Pi are powered by an official POE hat except the Master which use a Waveshare one with USB to power the fan.
The main problem was with the case which is clearly overpriced and non-compliant since it cannot be used directly. I had to file down all holes to allow the Pi holder to fit. I also wanted to reverse all RJ45 port so i had to file holes for the screws too. The original fans were also very noisy, so I changed them with two noctua. I am still waiting for microSd card support ..

<p align="center">
  <img src="https://github.com/sulianoar/communis/blob/main/Hardware/pictures/file%20case.png" width="450" title="bad case">
</p>

Detailled part list :

|Qty| Item                                                                                                                     | Price  |
|:--|:------------------------------------------------------------------------------------------------------------------------:|-------:|
| 1 | [Enclosure for Raspberry Pi Cluster](https://www.tindie.com/products/uctronics/complete-enclosure-for-raspberry-pi-cluster) | $65 |
| 1 | [Raspberry pi 4 4Go                                                              ](https://www.amazon.com/dp/B07TC2BK1X) |  $99   |
| 3 | [Raspberry pi 4 8Go                                                              ](https://www.amazon.com/dp/B0899VXM8F) | $119   |
| 4 | [Micro Sd card 16Gb                                                              ](https://www.amazon.com/dp/B019D6MKVI) | $6.50  |
| 3 | [Official Raspberry Pi POE Hat                                                   ](https://www.amazon.com/dp/B07GR9XQJH) | $37    |
| 1 | [Waveshare Power Over Ethernet HAT (Type C) - with external USB for internal fan ](https://www.amazon.com/dp/B0928Y5J32) | $28    |
| 4 | [CAT 6 Patch Cable 0.15M                                                         ](https://www.amazon.com/dp/B00ZRUMLYQ) | $10.50 |
| 1 | [TP-Link TL-SG1005P V2 5 Port Gigabit PoE Switch                                 ](https://www.amazon.com/dp/B076HZFY3F) | $50    |
| 2 | [Noctua NF-A8 5V PWM                                                             ](https://www.amazon.com/dp/B07DXMF32M) | $16    |
| 1 | [M3x35mm Pack of  (for internal fan)                                             ](https://www.amazon.com/dp/B08DRCSN4L) | $9     |
| 1 | [Fan Splitter Cable 1 to 2 Converter                                             ](https://www.amazon.com/dp/B07WN4G7KC) | $3.40  |
| 2 | [Cooling Fan Filter 80mm                                                         ](https://www.amazon.com/dp/B00315C03G) | $3.80  |
| 1 | [0.05m USB 2.0 A Male to Female 90 Angled Extension Adaptor cable       ](https://aliexpress.com/item/1005001459884748.html) | $2 |

Networking is very important for this project so i choose to add a failover WAN using a 4G LTE USB dongle to the master (the only pi connected to Internet).

|Qty| Item                                                                                                      | Price |
|:--|:---------------------------------------------------------------------------------------------------------:|------:|
| 1 | [Huawei ME909s-821 MiniPCIe LTE module 4G module ](https://www.aliexpress.com/item/1005001952119418.html) | $25   |
| 1 | [GeeekPi RPi 4G / 3G Hat](https://www.amazon.com/dp/B08FHMR8DZ)                                           | $17   |
| 1 | [Plug type-c/type-a data cable 10cm ](https://www.aliexpress.com/item/1005001952119418.html)              | $3    |
| 1 | [Pigtail Antenna Set](https://www.aliexpress.com/item/33006648960.html)                                   | $4.50 |



