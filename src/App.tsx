import Youtube from 'react-youtube'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import seedrandom from 'seedrandom';
import { Fragment, useRef, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { TrophyIcon } from '@heroicons/react/24/outline'
import { Player } from '@lottiefiles/react-lottie-player';
import axios from 'axios'
import './App.css';

dayjs.extend(customParseFormat)

const submit_music_url = 'https://airtable.com/embed/shrLN7ePgoPPQzS3s'
const music_list = 'https://dailymusic-list.kiznick.me'

const start_project_date = '2023-03-10'

type DailyMusic = (
    {
        date: string
    } & MusicData
) | null

type MusicData = {
    name: string
    artist: string
    youtube_id: string
    sender: {
        name: string | null
        message: string | null
    }
}

function randomArraySeed<T>(arr: T[], seed: string): T {
    const random = seedrandom(seed.toString())
    const randomIndex: number = Math.floor(random() * arr.length)
    return arr[randomIndex]
}

function number_format(n: number): string {
    return (+n).toFixed(0).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g,'$1,')
}

function App() {
    useEffect(() => {
        function getRandomMusic(today: string) {
            return axios.get(`${music_list}/all.json`)
                .then(res => {
                    const data = res.data
                    setIsLoading(false)
                    const music: MusicData = randomArraySeed(data, today)
                    if(!music) {
                        return setDailyMusic(null)
                    }
                    return setDailyMusic({
                        date: today,
                        ...music
                    })
                })
                .catch(err => {
                    setIsLoading(false)

                    console.error(err)
                })
        }
        
        if(window.location.pathname !== '/') {
            const input_date = dayjs(window.location.pathname.slice(1), 'YYYY-MM-DD', true)
            if(input_date.isValid() && !(input_date.isBefore(dayjs(start_project_date, 'YYYY-MM-DD', true)) || input_date.isAfter(dayjs()))) {
                const today = input_date.format('YYYY-MM-DD')
                axios.get(`${music_list}/${dayjs(input_date).format('YYYY')}/${dayjs(input_date).format('M')}.json`)
                    .then(res => {
                        const data = res.data
                        setIsLoading(false)
                        if(!data[today]) {
                            return getRandomMusic(today)
                        }
                        return setDailyMusic({
                            date: today,
                            ...data[today]
                        })
                    })
                    .catch(err => {
                        getRandomMusic(today)

                        console.error(err)
                    })
                return
            }
        }

        const today = dayjs().format('YYYY-MM-DD')
        axios.get(`${music_list}/${dayjs().format('YYYY')}/${dayjs().format('M')}.json`)
            .then(res => {
                const data = res.data
                setIsLoading(false)
                if(!data[today]) {
                    return getRandomMusic(today)
                }
                return setDailyMusic({
                    date: today,
                    ...data[today]
                })
            })
            .catch(err => {
                getRandomMusic(today)

                console.error(err)
            })
    }, [])

    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [dailyMusic, setDailyMusic] = useState<DailyMusic>(null)

    const [isStrikeModalOpen, setIsStrikeModalOpen] = useState<boolean>(false)
    
    const [isNewMaxStrike, setIsNewMaxStrike] = useState<boolean>(false)
    const [isMissStrike, setIsMissStrike] = useState<boolean>(false)
    const [isRepeat, setIsRepeat] = useState<boolean>(false)
    const [maxStrike, setMaxStrike] = useState<number>(0)
    const [currentStrike, setCurrentStrike] = useState<number>(0)

    function checkStrike() {
        if (typeof window == "undefined" || !window.localStorage) {
            return alert('Your browser does not support local storage. Please use another browser.')
        }
    
        const store_max_strike_number = 'k-max-strike'
        const store_current_strike_number = 'k-strike'
        const store_next_checkin = 'k-next-checkin'

        setIsNewMaxStrike(false)
        setIsMissStrike(false)
    
        const strike = window.localStorage.getItem(store_current_strike_number)
        if (strike) {
            const next_checkin = window.localStorage.getItem(store_next_checkin)
            if(next_checkin) {
                if(next_checkin === dayjs().format('YYYY-MM-DD')) {
                    if (parseInt(strike) + 1 > parseInt(window.localStorage.getItem(store_max_strike_number) || '0')) {
                        window.localStorage.setItem(store_max_strike_number, (parseInt(strike) + 1).toString())
                        setIsNewMaxStrike(true)
                    }
                    window.localStorage.setItem(store_current_strike_number, (parseInt(strike) + 1).toString())
                } else if(next_checkin === dayjs().add(1, 'day').format('YYYY-MM-DD')) {
                    setIsRepeat(true)
                } else {
                    if (parseInt(strike) > parseInt(window.localStorage.getItem(store_max_strike_number) || '0')) {
                        window.localStorage.setItem(store_max_strike_number, strike)
                    }
                    setCurrentStrike(parseInt(window.localStorage.getItem(store_current_strike_number) || '0'))
                    setIsMissStrike(true)
                    window.localStorage.setItem(store_current_strike_number, '1')
                }
            } else {
                window.localStorage.setItem(store_max_strike_number, strike)
                window.localStorage.setItem(store_current_strike_number, '1')
            }
        } else {
            window.localStorage.setItem(store_current_strike_number, '1')
        }
        
        window.localStorage.setItem(store_next_checkin, dayjs().add(1, 'day').format('YYYY-MM-DD'))

        setMaxStrike(parseInt(window.localStorage.getItem(store_max_strike_number) || '0'))
        !isMissStrike && setCurrentStrike(parseInt(window.localStorage.getItem(store_current_strike_number) || '0'))
        setIsStrikeModalOpen(true)
        return
    }

    const cancelButtonRef = useRef(null)

    if(isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
                    <div className="text-2xl mt-4">Loading...</div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="container mx-auto px-4">

                <Transition.Root show={isStrikeModalOpen} as={Fragment}>
                    <Dialog as="div" className="relative z-10" initialFocus={cancelButtonRef} onClose={setIsStrikeModalOpen}>
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
                        </Transition.Child>
                        <div className="fixed inset-0 z-10 overflow-y-auto">
                            <Player
                                src='https://assets4.lottiefiles.com/private_files/lf30_kvdn44jg.json'
                                className="absolute w-screen h-screen z-20"
                                autoplay={isNewMaxStrike}
                            />
                            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-out duration-300"
                                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                                    leave="ease-in duration-200"
                                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                >
                                    <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                            <div className="sm:flex sm:items-start">
                                                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                                                    {isRepeat ? `👀` : <TrophyIcon className="h-6 w-6 text-green-600" aria-hidden="true" />}
                                                </div>
                                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                                        {isRepeat ? `ฮั่นแน่~~~` : `Music Strike !`}
                                                    </Dialog.Title>
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-500">
                                                            {isNewMaxStrike ?
                                                                `ยินดีด้วยคุณได้สร้างสถิติใหม่ด้วยการฟังเพลงติดกัน ${number_format(currentStrike)} วัน ซึ่งมากที่สุดในสถิติของคุณ, ขอให้มีความสุขกับการฟังเพลงทุกวันนะ ❤️` :
                                                                isMissStrike ?
                                                                    `คุณลืมมาฟังเพลงหรือเปล่า..? คุณได้ฟังเพลงมาแล้ว ${number_format(currentStrike)} วันแต่มันก็เป็นอดีตไปแล้ววันนี้มาลองเก็บสถิติใหม่กันดีกว่า !` :
                                                                    isRepeat ? `มาฟังซ้ำหรอ~~~ ท่าจะชอบเพลงนี้นะเนี่ยยย, ลองกดที่ชื่อเพลงเพื่อไปดูผลงานอื่น ๆ ของศิลปินได้เลยนะ !` :
                                                                        `คุณได้ฟังเพลงติดกันแล้ว ${number_format(currentStrike)} วัน และคุณได้เก็บสถิติฟังเพลงติดกันสูงสุด ${number_format(maxStrike)} วัน เราอยากให้คุณมาฟังเพลงดี ๆ ที่นี่ทุกวันเลยนะ ❤️`
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                            <button
                                                type="button"
                                                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                                onClick={() => setIsStrikeModalOpen(false)}
                                                ref={cancelButtonRef}
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </Dialog>
                </Transition.Root>

                <div className="h-screen flex justify-center flex-col mx-center">
                    {
                        dailyMusic ? (
                            <>
                                <h1 className="text-3xl mb-1">
                                    Daily music <span className="text-pink-400 text-lg">({dayjs(dailyMusic.date).format('D MMMM YYYY')})</span>
                                </h1>

                                <p className="heading-text mb-1 hover:text-pink-200">
                                    <a href={`https://youtu.be/${dailyMusic.youtube_id}?utm_source=kiznick-DailyMusic&utm_medium=kiznick-DailyMusic_${dailyMusic.date}&utm_campaign=Day_${dailyMusic.date}`} target="_blank" rel="noopener noreferrer">
                                        {dailyMusic.name} - {dailyMusic.artist}
                                    </a>
                                </p>

                                {(dailyMusic.sender.name || dailyMusic.sender.message) && (
                                    <p className="text-2xl mb-2">
                                        {(dailyMusic.sender.name && dailyMusic.sender.message) ?
                                            `${dailyMusic.sender.message} - ${dailyMusic.sender.name}` :
                                            (dailyMusic.sender.name ? `from ${dailyMusic.sender.name}` : `${dailyMusic.sender.message} - someone who love you.`)
                                        }
                                    </p>
                                )}

                                <div className="relative">
                                    <div
                                        className="aspect-video mx-auto w-9/12"
                                    >
                                        <Youtube
                                            videoId={dailyMusic.youtube_id}
                                            opts={{
                                                height: '100%',
                                                width: '100%',
                                                playerVars: {
                                                    autoplay: 1,
                                                    modestbranding: 0,
                                                    loop: 1,
                                                    rel: 0,
                                                    iv_load_policy: 3,
                                                    cc_load_policy: 1,
                                                    cc_lang_pref: 'th',
                                                },
                                            }}
                                            className="w-full h-full absolute top-0 left-0 z-10"
                                            onEnd={checkStrike}
                                        />
                                        <div className="spotlight w-full"></div>
                                    </div>
                                </div>
                                {/*
                                    <div
                                        className="aspect-video mx-auto w-9/12"
                                    >
                                        <div className="spotlight absolute top-0 left-0 w-screen"></div>
                                        <Youtube
                                        videoId={dailyMusic.youtube_id}
                                        opts={{
                                            height: '100%',
                                            width: '100%',
                                            playerVars: {
                                            autoplay: 1,
                                            modestbranding: 0,
                                            loop: 1,
                                            rel: 0,
                                            iv_load_policy: 3,
                                            cc_load_policy: 1,
                                            cc_lang_pref: 'th',
                                            },
                                        }}
                                        className="w-full h-full z-10"
                                        />
                                    </div>
                                */}
                            </>
                        ) : (
                            <>
                                <h1 className="text-3xl">
                                    No music today.
                                </h1>
                                <p className="text-2xl mb-3">
                                    แย่ยัง... วันนี้ยังไม่มีเพลงเลย แต่มาช่วยเราเลือกเพลงกันเถอะ !
                                </p>
                                <a
                                    href={submit_music_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <button
                                        className="gradient-border py-3 px-8 rounded"
                                    >
                                        ลองมาแชร์เพลงทีคุณชอบสิ !
                                    </button>
                                </a>
                                <div className="spotlight w-full"></div>
                            </>
                        )
                    }

                    <p className="mt-3 text-center">
                        อยากแชร์เพลงดี ๆ กับคนอื่น ?, มาแชร์ได้
                        <a
                            href={submit_music_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-400 hover:text-pink-700"
                        >
                            ที่นี่
                        </a>
                        เลยยย !
                    </p>

                    <p className="mt-3 text-center">
                        Make with ❤️ by <a href="https://kiznick.in.th" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-700">kiznick</a>, open source on <a href="https://github.com/kiznick/dailymusic" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-700">Github</a>
                    </p>
                </div>
            </div>
        </>
    )
}

export default App;
