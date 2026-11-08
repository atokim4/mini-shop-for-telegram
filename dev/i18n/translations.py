# Russian and Uzbek (Latin) translations, written by hand. Run: python3 dev/i18n/translations.py
# Fills languages/*.po from the .pot; compile with: wp i18n make-mo languages
import re
from pathlib import Path

T = {
"Mini Shop for Telegram": ("Мини-магазин для Telegram", "Telegram uchun mini do‘kon"),
"Turns your WooCommerce store into a Telegram Mini App shop run by your own bot: catalog, cart, checkout handoff and order status messages. Self-hosted, no third-party service.": (
 "Превращает магазин WooCommerce в Telegram Mini App на вашем собственном боте: каталог, корзина, переход к оформлению заказа и сообщения о статусе заказа. Работает на вашем сайте, без сторонних сервисов.",
 "WooCommerce do‘koningizni o‘z botingizdagi Telegram Mini App do‘koniga aylantiradi: katalog, savat, buyurtmani rasmiylashtirishga o‘tish va buyurtma holati haqida xabarlar. O‘z saytingizda ishlaydi, uchinchi tomon xizmatlarisiz."),
"Unexpected answer from Telegram (HTTP %d).": ("Неожиданный ответ от Telegram (HTTP %d).", "Telegram kutilmagan javob qaytardi (HTTP %d)."),
"Telegram rejected the request.": ("Telegram отклонил запрос.", "Telegram so‘rovni rad etdi."),
"Telegram did not return the bot profile.": ("Telegram не вернул профиль бота.", "Telegram bot profilini qaytarmadi."),
"Shop": ("Магазин", "Do‘kon"),
"Open the shop from the Telegram bot to place an order.": ("Откройте магазин через Telegram-бота, чтобы оформить заказ.", "Buyurtma berish uchun do‘konni Telegram bot orqali oching."),
"Your cart is empty.": ("Ваша корзина пуста.", "Savatingiz bo‘sh."),
"A product in your cart is no longer available.": ("Один из товаров в корзине больше недоступен.", "Savatdagi mahsulotlardan biri endi mavjud emas."),
"Choose the options of “%s” again.": ("Выберите параметры «%s» ещё раз.", "«%s» parametrlarini qaytadan tanlang."),
"“%s” is out of stock.": ("«%s» нет в наличии.", "«%s» tugagan."),
"That quantity of “%s” is not available.": ("Такого количества «%s» нет в наличии.", "«%s» bunday miqdorda mavjud emas."),
"All": ("Все", "Hammasi"),
"Search products": ("Поиск товаров", "Mahsulot qidirish"),
"Add to cart": ("В корзину", "Savatga"),
"In cart": ("В корзине", "Savatda"),
"Out of stock": ("Нет в наличии", "Tugagan"),
"from %s": ("от %s", "%s dan"),
"Choose %s": ("Выберите: %s", "Tanlang: %s"),
"This combination is not available": ("Такой вариант недоступен", "Bunday variant mavjud emas"),
"Cart": ("Корзина", "Savat"),
"Your cart is empty": ("Корзина пуста", "Savat bo‘sh"),
"Add something from the catalog and it will wait here.": ("Добавьте товары из каталога, и они появятся здесь.", "Katalogdan mahsulot qo‘shing, ular shu yerda turadi."),
"Browse the catalog": ("Открыть каталог", "Katalogni ochish"),
"Remove": ("Удалить", "O‘chirish"),
"Decrease quantity": ("Уменьшить количество", "Miqdorni kamaytirish"),
"Increase quantity": ("Увеличить количество", "Miqdorni oshirish"),
"Subtotal": ("Сумма", "Jami"),
"Shipping and taxes are calculated at checkout.": ("Доставка и налоги рассчитываются при оформлении.", "Yetkazib berish va soliqlar rasmiylashtirishda hisoblanadi."),
"View cart · %s": ("Корзина · %s", "Savat · %s"),
"Checkout · %s": ("Оформить · %s", "Rasmiylashtirish · %s"),
"Loading the catalog…": ("Загружаем каталог…", "Katalog yuklanmoqda…"),
"Could not load the shop. Check your connection.": ("Не удалось загрузить магазин. Проверьте подключение.", "Do‘konni yuklab bo‘lmadi. Internet aloqasini tekshiring."),
"Try again": ("Повторить", "Qayta urinish"),
"Nothing here yet": ("Здесь пока пусто", "Hozircha bu yerda hech narsa yo‘q"),
"No products match “%s”": ("По запросу «%s» ничего не найдено", "«%s» bo‘yicha hech narsa topilmadi"),
"Checkout failed. Please try again.": ("Не удалось перейти к оформлению. Попробуйте ещё раз.", "Rasmiylashtirishga o‘tib bo‘lmadi. Qayta urinib ko‘ring."),
"Open this shop from its Telegram bot to place an order.": ("Откройте магазин через его Telegram-бота, чтобы оформить заказ.", "Buyurtma berish uchun do‘konni uning Telegram boti orqali oching."),
"Some items changed since you added them and were updated.": ("Некоторые товары изменились после добавления в корзину и были обновлены.", "Ba’zi mahsulotlar savatga qo‘shilgandan keyin o‘zgardi va yangilandi."),
"Back": ("Назад", "Orqaga"),
"Telegram: buyer was told the order is “%s”.": ("Telegram: покупателю сообщили, что заказ «%s».", "Telegram: xaridorga buyurtma holati «%s» ekani xabar qilindi."),
"Telegram message failed: %s": ("Не удалось отправить сообщение в Telegram: %s", "Telegram xabarini yuborib bo‘lmadi: %s"),
"Order %1$s: %2$s": ("Заказ %1$s: %2$s", "Buyurtma %1$s: %2$s"),
"Total: %s": ("Итого: %s", "Jami: %s"),
"Payment received. We are preparing your order.": ("Оплата получена. Готовим ваш заказ.", "To‘lov qabul qilindi. Buyurtmangizni tayyorlayapmiz."),
"We are waiting for your payment to be confirmed.": ("Ждём подтверждения оплаты.", "To‘lov tasdiqlanishini kutyapmiz."),
"Your order is complete. Thank you for shopping with us!": ("Заказ выполнен. Спасибо за покупку!", "Buyurtmangiz bajarildi. Xaridingiz uchun rahmat!"),
"Your order was cancelled. Contact the shop if you have questions.": ("Заказ отменён. Если есть вопросы, свяжитесь с магазином.", "Buyurtmangiz bekor qilindi. Savollar bo‘lsa, do‘kon bilan bog‘laning."),
"Your order was refunded.": ("Деньги за заказ возвращены.", "Buyurtma uchun pul qaytarildi."),
"Telegram buyer:": ("Покупатель в Telegram:", "Telegramdagi xaridor:"),
"(id %d)": ("(id %d)", "(id %d)"),
"Mini Shop for Telegram needs WooCommerce to be installed and active.": ("Для работы Mini Shop for Telegram нужен установленный и активный WooCommerce.", "Mini Shop for Telegram ishlashi uchun WooCommerce o‘rnatilgan va faol bo‘lishi kerak."),
"Telegram Mini Shop": ("Магазин в Telegram", "Telegram do‘koni"),
"Settings": ("Настройки", "Sozlamalar"),
"Settings saved. The bot token was removed.": ("Настройки сохранены. Токен бота удалён.", "Sozlamalar saqlandi. Bot tokeni o‘chirildi."),
"Settings saved, but that does not look like a bot token. Copy it from @BotFather again.": ("Настройки сохранены, но это не похоже на токен бота. Скопируйте его из @BotFather ещё раз.", "Sozlamalar saqlandi, lekin bu bot tokeniga o‘xshamaydi. Uni @BotFather dan qaytadan nusxalang."),
"Settings saved.": ("Настройки сохранены.", "Sozlamalar saqlandi."),
"Bot disconnected. The token is still saved.": ("Бот отключён. Токен по-прежнему сохранён.", "Bot uzildi. Token saqlangan holda qoldi."),
"Connected to @%s. Open the bot in Telegram and send /start.": ("Подключено к @%s. Откройте бота в Telegram и отправьте /start.", "@%s ga ulandi. Botni Telegramda oching va /start yuboring."),
"Telegram said: %s": ("Ответ Telegram: %s", "Telegram javobi: %s"),
"You are not allowed to change these settings.": ("У вас нет прав на изменение этих настроек.", "Bu sozlamalarni o‘zgartirishga ruxsatingiz yo‘q."),
"This checkout link has expired. Open the shop in Telegram and tap Checkout again.": ("Ссылка на оформление устарела. Откройте магазин в Telegram и снова нажмите «Оформить».", "Rasmiylashtirish havolasi eskirgan. Do‘konni Telegramda oching va «Rasmiylashtirish» tugmasini qayta bosing."),
"Welcome to %s! Tap the button below to browse the catalog and order right here in Telegram.": ("Добро пожаловать в %s! Нажмите кнопку ниже, чтобы открыть каталог и заказать прямо в Telegram.", "%s ga xush kelibsiz! Katalogni ko‘rish va shu yerning o‘zida, Telegramda buyurtma berish uchun quyidagi tugmani bosing."),
"Bot status": ("Состояние бота", "Bot holati"),
"Bot": ("Бот", "Bot"),
"Connected to @%s": ("Подключено к @%s", "@%s ga ulangan"),
"Open in Telegram": ("Открыть в Telegram", "Telegramda ochish"),
"Token saved, bot not connected.": ("Токен сохранён, бот не подключён.", "Token saqlangan, bot ulanmagan."),
"Not set up. Create a bot with @BotFather and paste its token below.": ("Не настроено. Создайте бота через @BotFather и вставьте его токен ниже.", "Sozlanmagan. @BotFather orqali bot yarating va uning tokenini quyiga joylang."),
"Last Telegram error: %s": ("Последняя ошибка Telegram: %s", "Telegramning oxirgi xatosi: %s"),
"Mini App URL": ("Адрес Mini App", "Mini App manzili"),
"Set automatically as the bot menu button. Telegram needs an HTTPS site.": ("Устанавливается автоматически как кнопка меню бота. Telegram требует сайт на HTTPS.", "Bot menyusi tugmasi sifatida avtomatik o‘rnatiladi. Telegram uchun sayt HTTPS da bo‘lishi kerak."),
"Reconnect bot": ("Переподключить бота", "Botni qayta ulash"),
"Connect bot": ("Подключить бота", "Botni ulash"),
"Disconnect": ("Отключить", "Uzish"),
"Bot token": ("Токен бота", "Bot tokeni"),
"Saved. Paste a new token to replace it.": ("Сохранён. Вставьте новый токен, чтобы заменить его.", "Saqlangan. Almashtirish uchun yangi token joylang."),
"Stored on this site only and never shown again. Saving a new token connects the bot.": ("Хранится только на этом сайте и больше не показывается. При сохранении нового токена бот подключается.", "Faqat shu saytda saqlanadi va boshqa ko‘rsatilmaydi. Yangi token saqlanganda bot ulanadi."),
"Remove the saved token": ("Удалить сохранённый токен", "Saqlangan tokenni o‘chirish"),
"Reply to /start": ("Ответ на /start", "/start ga javob"),
"Default: a short welcome with the shop name.": ("По умолчанию: короткое приветствие с названием магазина.", "Standart: do‘kon nomi bilan qisqa salomlashuv."),
"Button text": ("Текст кнопки", "Tugma matni"),
"Storefront": ("Витрина", "Vitrina"),
"Shop title": ("Название магазина", "Do‘kon nomi"),
"Accent colour": ("Акцентный цвет", "Asosiy rang"),
"Hex colour for prices and badges. Leave empty to follow the buyer’s Telegram theme.": ("HEX-цвет для цен и значков. Оставьте пустым, чтобы использовать тему Telegram покупателя.", "Narxlar va belgilar uchun HEX rang. Xaridorning Telegram mavzusiga moslash uchun bo‘sh qoldiring."),
"Categories": ("Категории", "Toifalar"),
"None ticked: the whole catalog (simple and variable products).": ("Ничего не отмечено: весь каталог (простые и вариативные товары).", "Hech biri belgilanmasa: butun katalog (oddiy va variantli mahsulotlar)."),
"Buyer messages": ("Сообщения покупателю", "Xaridorga xabarlar"),
"Send a Telegram message when an order becomes": ("Отправлять сообщение в Telegram, когда заказ получает статус", "Buyurtma quyidagi holatga o‘tganda Telegramda xabar yuborish"),
"Order statuses": ("Статусы заказа", "Buyurtma holatlari"),
"This shop needs JavaScript. Open it from the Telegram bot.": ("Для работы магазина нужен JavaScript. Откройте его через Telegram-бота.", "Do‘kon ishlashi uchun JavaScript kerak. Uni Telegram bot orqali oching."),
}

def esc(s):
    return s.replace('\\', '\\\\').replace('"', '\\"')

root = Path(__file__).resolve().parents[2] / 'languages'
pot = (root / 'mini-shop-for-telegram.pot').read_text()
ids = re.findall(r'\nmsgid "(.+?)"\n', pot)
for idx, (locale, lang, plural) in enumerate([('ru_RU', 'ru', 'nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);'), ('uz_UZ', 'uz', 'nplurals=1; plural=0;')]):
    out = ['msgid ""', 'msgstr ""', '"Project-Id-Version: Mini Shop for Telegram\\n"', '"MIME-Version: 1.0\\n"', '"Content-Type: text/plain; charset=UTF-8\\n"', '"Content-Transfer-Encoding: 8bit\\n"', f'"Language: {lang}\\n"', f'"Plural-Forms: {plural}\\n"', '"X-Domain: mini-shop-for-telegram\\n"', '']
    missing = []
    for msgid in ids:
        if msgid.startswith('http') or msgid == 'Sunnatulla E.':
            continue
        if msgid not in T:
            missing.append(msgid)
            continue
        out += [f'msgid "{msgid}"', f'msgstr "{esc(T[msgid][idx])}"', '']
    (root / f'mini-shop-for-telegram-{locale}.po').write_text('\n'.join(out))
    print(locale, 'missing:', missing)
