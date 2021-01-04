const captcha = [
    'bird',
    'party',
    'crypt',
    'handle',
    'validate',
    'random',
    'fruits',
    'apple',
    'ceo',
    'developer',
    'md',
    'market',
    'currency',
    'jvz',
    'exchange',
    'internet',
    'cyber',
    'world'
]

const generate_random = (int, limit) => {
    return Math.floor(Math.random() * int) + limit;
}

const create_captcha = () => {
    let i
    var captcha_array = []
    for (i = 1; i < 6; i++) {
        var element = captcha[generate_random(i + 1, i)]
        if (captcha_array.includes(element)) {
            i = i-1;
        } else {
            captcha_array.push(element)
        }
    }
    return captcha_array;
}

module.exports = {
    captcha,
    create_captcha
}