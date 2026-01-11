import React, { useContext, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'
import Loading from '../../components/student/Loading'
import { toast } from 'react-toastify'
import Quill from 'quill'
import uniqid from 'uniqid'
import axios from 'axios'

const EditCourse = () => {
  const { id } = useParams()
  const { backendUrl, getToken, navigate } = useContext(AppContext)

  const editorRef = useRef(null)
  const quillRef = useRef(null)

  const [loading, setLoading] = useState(true)

  const [courseTitle, setCourseTitle] = useState('')
  const [coursePrice, setCoursePrice] = useState(0)
  const [discount, setDiscount] = useState(0)

  const [existingThumbnail, setExistingThumbnail] = useState('')
  const [image, setImage] = useState(null)
  const [thumbPreview, setThumbPreview] = useState(null)

  const [chapters, setChapters] = useState([])

  const [showPopup, setShowPopup] = useState(false)
  const [currentChapterId, setCurrentChapterId] = useState(null)

  // ✅ Chapter popup (replaces window.prompt)
  const [showChapterPopup, setShowChapterPopup] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')

  const [lectureDetails, setLectureDetails] = useState({
    lectureTitle: '',
    lectureDuration: '',
    isPreviewFree: false,
  })

  const [lectureVideoFile, setLectureVideoFile] = useState(null)
  // { [lectureId]: File } (only new/replaced videos)
  const [lectureVideos, setLectureVideos] = useState({})

  const [courseDescriptionHtml, setCourseDescriptionHtml] = useState('')

  // Upload progress UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0) // 0 - 100
  const [uploadPhase, setUploadPhase] = useState('idle') // idle | uploading | processing
  const [uploadLoadedBytes, setUploadLoadedBytes] = useState(0)
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0)
  const [currentUploadItem, setCurrentUploadItem] = useState('')
  const abortControllerRef = useRef(null)

  const isYoutubeUrl = (url) => /youtu\.be|youtube\.com/i.test(String(url || ''))

  const formatBytes = (bytes) => {
    const b = Number(bytes || 0)
    if (!b) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(b) / Math.log(k))
    return `${(b / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`
  }

  const stripHtmlToText = (html) => {
    return String(html || '')
      .replace(/<(.|\n)*?>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
  }

  const cancelUpload = () => {
    if (uploadPhase !== 'uploading') return
    try {
      abortControllerRef.current?.abort?.()
    } catch (e) {
      // no-op
    }
  }

  const resetUploadState = () => {
    setIsSubmitting(false)
    setUploadProgress(0)
    setUploadPhase('idle')
    setUploadLoadedBytes(0)
    setUploadTotalBytes(0)
    setCurrentUploadItem('')
    abortControllerRef.current = null
  }

  const fetchCourse = async () => {
    try {
      setLoading(true)
      const token = await getToken()

      const { data } = await axios.get(
        backendUrl + `/api/instructor/course/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (!data.success) {
        toast.error(data.message)
        navigate('/instructor/my-courses')
        return
      }

      const course = data.course
      setCourseTitle(course.courseTitle || '')
      setCoursePrice(course.coursePrice ?? 0)
      setDiscount(course.discount ?? 0)
      setExistingThumbnail(course.courseThumbnail || '')
      setChapters(Array.isArray(course.courseContent) ? course.courseContent : [])
      setCourseDescriptionHtml(course.courseDescription || '')
    } catch (error) {
      toast.error(error.message)
      navigate('/instructor/my-courses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Initialize Quill AFTER loading finishes and hydrate description
  useEffect(() => {
    if (!loading && editorRef.current) {
      if (!quillRef.current) {
        quillRef.current = new Quill(editorRef.current, { theme: 'snow' })
      }
      if (typeof courseDescriptionHtml === 'string') {
        quillRef.current.root.innerHTML = courseDescriptionHtml
      }
    }
  }, [loading, courseDescriptionHtml])

  // Thumbnail preview (avoid URL.createObjectURL on every render)
  useEffect(() => {
    if (!image) {
      setThumbPreview(null)
      return
    }
    const url = URL.createObjectURL(image)
    setThumbPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const handleChapter = (action, chapterId) => {
    if (action === 'add') {
      // ✅ Instead of window.prompt, open UI modal
      setNewChapterTitle('')
      setShowChapterPopup(true)
    } else if (action === 'remove') {
      const toRemove = chapters.find((c) => c.chapterId === chapterId)
      if (toRemove?.chapterContent?.length) {
        setLectureVideos((prev) => {
          const next = { ...prev }
          toRemove.chapterContent.forEach((l) => {
            if (l?.lectureId) delete next[l.lectureId]
          })
          return next
        })
      }
      setChapters(chapters.filter((chapter) => chapter.chapterId !== chapterId))
    } else if (action === 'toggle') {
      setChapters(
        chapters.map((chapter) =>
          chapter.chapterId === chapterId
            ? { ...chapter, collapsed: !chapter.collapsed }
            : chapter
        )
      )
    }
  }

  // ✅ Add chapter from UI modal (same logic as before)
  const addChapterFromPopup = () => {
    const title = newChapterTitle.trim()
    if (!title) {
      toast.error('Enter chapter name')
      return
    }

    const newChapter = {
      chapterId: uniqid(),
      chapterTitle: title,
      chapterContent: [],
      collapsed: false,
      chapterOrder: chapters.length > 0 ? chapters.slice(-1)[0].chapterOrder + 1 : 1,
    }

    setChapters([...chapters, newChapter])
    setShowChapterPopup(false)
    setNewChapterTitle('')
  }

  const handleLecture = (action, chapterId, lectureIndex) => {
    if (action === 'add') {
      setCurrentChapterId(chapterId)
      setShowPopup(true)
    } else if (action === 'remove') {
      const chapter = chapters.find((c) => c.chapterId === chapterId)
      const lectureId = chapter?.chapterContent?.[lectureIndex]?.lectureId

      if (lectureId) {
        setLectureVideos((prev) => {
          const next = { ...prev }
          delete next[lectureId]
          return next
        })
      }

      setChapters(
        chapters.map((chapter) => {
          if (chapter.chapterId === chapterId) {
            const updated = { ...chapter }
            updated.chapterContent = [...(updated.chapterContent || [])]
            updated.chapterContent.splice(lectureIndex, 1)
            return updated
          }
          return chapter
        })
      )
    }
  }

  const addLecture = () => {
    const title = lectureDetails.lectureTitle?.trim()
    const duration = Number(lectureDetails.lectureDuration)

    if (!title || !duration || Number.isNaN(duration) || duration <= 0) {
      toast.error('Please enter lecture title and duration')
      return
    }

    if (!lectureVideoFile) {
      toast.error('Please select a lecture video file')
      return
    }

    const lectureId = uniqid()

    setLectureVideos((prev) => ({ ...prev, [lectureId]: lectureVideoFile }))

    setChapters(
      chapters.map((chapter) => {
        if (chapter.chapterId === currentChapterId) {
          const updated = { ...chapter }
          const content = [...(updated.chapterContent || [])]
          const lastOrder = content.length > 0 ? content.slice(-1)[0].lectureOrder : 0

          const newLecture = {
            lectureTitle: title,
            lectureDuration: duration,
            lectureUrl: '', // backend will fill after upload
            isPreviewFree: Boolean(lectureDetails.isPreviewFree),
            lectureId,
            lectureOrder: lastOrder + 1,
          }

          content.push(newLecture)
          updated.chapterContent = content
          return updated
        }
        return chapter
      })
    )

    setShowPopup(false)
    setLectureDetails({
      lectureTitle: '',
      lectureDuration: '',
      isPreviewFree: false,
    })
    setLectureVideoFile(null)
  }

  const handleSubmit = async (e) => {
    try {
      e.preventDefault()
      if (isSubmitting) return

      // courseDescription is required in schema; prevent empty description submission
      const descriptionHtml = quillRef.current?.root?.innerHTML ?? courseDescriptionHtml ?? ''
      const descriptionText = stripHtmlToText(descriptionHtml)

      if (!descriptionText) {
        toast.error('Course description is required')
        return
      }

      // Ensure no YouTube links remain; require upload for those lectures
      const missingOrInvalid = []
      chapters.forEach((chapter) => {
        const lectures = Array.isArray(chapter.chapterContent) ? chapter.chapterContent : []
        lectures.forEach((lecture) => {
          const lid = lecture?.lectureId
          const url = lecture?.lectureUrl

          // New lecture (url empty) OR old YouTube URL must have an uploaded file
          if ((!url || String(url).trim() === '' || isYoutubeUrl(url)) && (!lid || !lectureVideos[lid])) {
            missingOrInvalid.push(lecture?.lectureTitle || 'Untitled lecture')
          }
        })
      })

      if (missingOrInvalid.length > 0) {
        toast.error(`Upload a video for: ${missingOrInvalid[0]}`)
        return
      }

      const courseData = {
        courseTitle,
        courseDescription: descriptionHtml,
        coursePrice: Number(coursePrice),
        discount: Number(discount),
        courseContent: chapters,
      }

      const formData = new FormData()
      formData.append('courseData', JSON.stringify(courseData))
      if (image) formData.append('image', image)

      // Attach only the lecture videos the instructor selected (new or replaced)
      Object.entries(lectureVideos).forEach(([lectureId, file]) => {
        if (file) formData.append(`video_${lectureId}`, file)
      })

      // Prepare upload items list (for UI)
      const uploadItems = []
      if (image) uploadItems.push({ label: `Thumbnail: ${image.name}`, size: image.size || 0 })

      Object.entries(lectureVideos).forEach(([lectureId, file]) => {
        if (!file) return
        let lectureTitle = ''
        chapters.forEach((ch) => {
          ;(ch?.chapterContent || []).forEach((lec) => {
            if (lec?.lectureId === lectureId) lectureTitle = lec?.lectureTitle || ''
          })
        })
        uploadItems.push({
          label: `Video: ${lectureTitle || lectureId} (${file.name})`,
          size: file.size || 0
        })
      })

      const estimatedTotalBytes = uploadItems.reduce((acc, x) => acc + (Number(x.size) || 0), 0)

      // Start progress UI
      setIsSubmitting(true)
      setUploadPhase('uploading')
      setUploadProgress(0)
      setUploadLoadedBytes(0)
      setUploadTotalBytes(estimatedTotalBytes)
      setCurrentUploadItem(uploadItems[0]?.label || 'Submitting changes…')

      const controller = new AbortController()
      abortControllerRef.current = controller

      const token = await getToken()

      const { data } = await axios.put(
        backendUrl + `/api/instructor/course/${id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            const loaded = Number(progressEvent?.loaded || 0)
            const totalFromBrowser = Number(progressEvent?.total || 0)
            const total = totalFromBrowser || estimatedTotalBytes || 0

            setUploadLoadedBytes(loaded)
            if (total) setUploadTotalBytes(total)

            let percent = total ? Math.round((loaded * 100) / total) : 0
            if (!Number.isFinite(percent)) percent = 0
            percent = Math.max(0, Math.min(100, percent))
            setUploadProgress(percent)

            // Best-effort: guess current file based on sizes
            if (estimatedTotalBytes && uploadItems.length > 0) {
              let running = 0
              let current = uploadItems[uploadItems.length - 1].label
              for (const item of uploadItems) {
                running += Number(item.size || 0)
                if (loaded <= running) {
                  current = item.label
                  break
                }
              }
              setCurrentUploadItem(current)
            }

            // Once browser finishes sending, server still needs time (Cloudinary + DB)
            if (percent >= 100) setUploadPhase('processing')
          }
        }
      )

      if (data.success) {
        toast.success(data.message)
        resetUploadState()
        navigate('/instructor/my-courses')
        return
      } else {
        toast.error(data.message)
        resetUploadState()
        return
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        toast.info('Upload canceled')
        resetUploadState()
        return
      }
      toast.error(error?.response?.data?.message || error.message)
      resetUploadState()
    }
  }

  if (loading) return <Loading />

  return (
    <div className='h-screen overflow-scroll flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0'>
      <form onSubmit={handleSubmit} className='flex flex-col gap-4 max-w-md w-full text-gray-500'>

        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-medium text-gray-900'>Edit Course</h2>
          <button
            type='button'
            onClick={() => navigate('/instructor/my-courses')}
            className='text-sm text-gray-600 underline'
          >
            Back
          </button>
        </div>

        <div className='flex flex-col gap-1'>
          <p>Course Title</p>
          <input
            onChange={e => setCourseTitle(e.target.value)}
            value={courseTitle}
            type="text"
            placeholder='Type here'
            className='outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500'
            required
          />
        </div>

        <div className='flex flex-col gap-1'>
          <p>Course Description</p>
          < div ref={editorRef} className="min-h-[180px]"></div>
        </div>

        <div className='flex items-center justify-between flex-wrap'>
          <div className='flex flex-col gap-1'>
            <p>Course Price in PKR</p>
            <input
              onChange={e => setCoursePrice(e.target.value)}
              value={coursePrice}
              type="number"
              placeholder='500' min={500} max={5000}
              className='outline-none md:py-2.5 py-2 w-28 px-3 rounded border border-gray-500'
              required
            />
          </div>

          <div className='flex md:flex-row flex-col items-center gap-3'>
            <p>Course Thumbnail</p>
            <label htmlFor='thumbnailImage' className='flex items-center gap-3'>
              <img src={assets.file_upload_icon} alt="" className='p-3 bg-blue-500 rounded' />
              <input
                type="file"
                id='thumbnailImage'
                onChange={e => setImage(e.target.files?.[0] || null)}
                accept="image/*"
                hidden
              />
              {(thumbPreview || existingThumbnail) ? (
                <img
                  className='max-h-10'
                  src={thumbPreview || existingThumbnail}
                  alt="thumbnail"
                />
              ) : null}
            </label>
          </div>
        </div>

        <div className='flex flex-col gap-1'>
          <p>Discount %</p>
          <input
            onChange={e => setDiscount(e.target.value)}
            value={discount}
            type="number"
            min={0}
            max={100}
            className='outline-none md:py-2.5 py-2 w-28 px-3 rounded border border-gray-500'
            required
          />
        </div>

        {/* Chapters & Lectures */}
        <div>
          {chapters.map((chapter, chapterIndex) => (
            <div key={chapter.chapterId || chapterIndex} className="bg-white border rounded-lg mb-4">
              <div className="flex justify-between items-center p-4 border-b">
                <div className="flex items-center">
                  <img
                    className={`mr-2 cursor-pointer transition-all ${chapter.collapsed && "-rotate-90"} `}
                    onClick={() => handleChapter('toggle', chapter.chapterId)}
                    src={assets.dropdown_icon}
                    width={14}
                    alt=""
                  />
                  <span className="font-semibold">{chapterIndex + 1} {chapter.chapterTitle}</span>
                </div>
                <span className="text-gray-500">{(chapter.chapterContent || []).length} Lectures</span>
                <img onClick={() => handleChapter('remove', chapter.chapterId)} src={assets.cross_icon} alt="" className='cursor-pointer' />
              </div>

              {!chapter.collapsed && (
                <div className="p-4">
                  {(chapter.chapterContent || []).map((lecture, lectureIndex) => (
                    <div key={lecture.lectureId || lectureIndex} className="flex justify-between items-center mb-2">
                      <span>
                        {lectureIndex + 1} {lecture.lectureTitle} - {lecture.lectureDuration} mins -{' '}
                        {lectureVideos[lecture.lectureId]
                          ? <span className="text-green-600">New video: {lectureVideos[lecture.lectureId].name}</span>
                          : (
                            lecture.lectureUrl
                              ? (
                                <a
                                  href={lecture.lectureUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={isYoutubeUrl(lecture.lectureUrl) ? "text-red-600 underline" : "text-blue-500"}
                                >
                                  {isYoutubeUrl(lecture.lectureUrl) ? 'YouTube link (must replace)' : 'Current video'}
                                </a>
                              )
                              : <span className="text-red-600">No video (must upload)</span>
                          )
                        }{' '}
                        - {lecture.isPreviewFree ? 'Free Preview' : 'Paid'}
                      </span>
                      <img onClick={() => handleLecture('remove', chapter.chapterId, lectureIndex)} src={assets.cross_icon} alt="" className='cursor-pointer' />
                    </div>
                  ))}
                  <div
                    className="inline-flex bg-gray-700 hover:bg-gray-800 text-white p-2 rounded cursor-pointer mt-2"
                    onClick={() => handleLecture('add', chapter.chapterId)}
                  >
                    + Add Lecture
                  </div>
                </div>
              )}
            </div>
          ))}

          <div
            className="flex justify-center items-center bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg cursor-pointer"
            onClick={() => handleChapter('add')}
          >
            + Add Chapter
          </div>

          {/* ✅ Chapter Add UI Popup (replaces prompt) */}
          {showChapterPopup && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
              <div className="bg-white text-gray-700 p-4 rounded relative w-full max-w-80">
                <h2 className="text-lg font-semibold mb-4">Add Chapter</h2>

                <div className="mb-3">
                  <p>Chapter Name</p>
                  <input
                    autoFocus
                    type="text"
                    className="mt-1 block w-full border rounded py-1 px-2"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addChapterFromPopup()
                      }
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded"
                    onClick={() => {
                      setShowChapterPopup(false)
                      setNewChapterTitle('')
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="w-full bg-blue-400 text-white px-4 py-2 rounded"
                    onClick={addChapterFromPopup}
                  >
                    Add
                  </button>
                </div>

                <img
                  onClick={() => {
                    setShowChapterPopup(false)
                    setNewChapterTitle('')
                  }}
                  src={assets.cross_icon}
                  className='absolute top-4 right-4 w-4 cursor-pointer'
                  alt=""
                />
              </div>
            </div>
          )}

          {/* Lecture Popup (existing) */}
          {showPopup && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
              <div className="bg-white text-gray-700 p-4 rounded relative w-full max-w-80">
                <h2 className="text-lg font-semibold mb-4">Add Lecture</h2>

                <div className="mb-2">
                  <p>Lecture Title</p>
                  <input
                    type="text"
                    className="mt-1 block w-full border rounded py-1 px-2"
                    value={lectureDetails.lectureTitle}
                    onChange={(e) => setLectureDetails({ ...lectureDetails, lectureTitle: e.target.value })}
                  />
                </div>

                <div className="mb-2">
                  <p>Duration (minutes)</p>
                  <input
                    type="number"
                    className="mt-1 block w-full border rounded py-1 px-2"
                    value={lectureDetails.lectureDuration}
                    onChange={(e) => setLectureDetails({ ...lectureDetails, lectureDuration: e.target.value })}
                  />
                </div>

                <div className="mb-2">
                  <p>Lecture Video</p>
                  <input
                    type="file"
                    accept="video/*"
                    className="mt-1 block w-full"
                    onChange={(e) => setLectureVideoFile(e.target.files?.[0] || null)}
                  />
                  {lectureVideoFile && (
                    <p className="text-xs text-gray-500 mt-1">{lectureVideoFile.name}</p>
                  )}
                </div>

                <div className="flex gap-2 my-4">
                  <p>Is Preview Free?</p>
                  <input
                    type="checkbox"
                    className='mt-1 scale-125'
                    checked={lectureDetails.isPreviewFree}
                    onChange={(e) => setLectureDetails({ ...lectureDetails, isPreviewFree: e.target.checked })}
                  />
                </div>

                <button type='button' className="w-full bg-blue-400 text-white px-4 py-2 rounded" onClick={addLecture}>Add</button>
                <img onClick={() => setShowPopup(false)} src={assets.cross_icon} className='absolute top-4 right-4 w-4 cursor-pointer' alt="" />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`bg-black text-white w-max py-2.5 px-8 rounded my-4 ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? (uploadPhase === 'processing' ? 'PROCESSING…' : `UPLOADING ${uploadProgress}%`) : 'UPDATE'}
        </button>
      </form>

      {/* Upload progress overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-gray-500">
                  {uploadPhase === 'processing' ? 'Upload complete — saving changes…' : 'Uploading update…'}
                </p>

                <p className="mt-1 font-semibold text-gray-800">
                  {uploadPhase === 'processing' ? 'Processing on server' : `${uploadProgress}%`}
                </p>

                {uploadPhase !== 'processing' && currentUploadItem ? (
                  <p className="mt-1 text-xs text-gray-500 truncate">Current: {currentUploadItem}</p>
                ) : null}

                <p className="mt-1 text-xs text-gray-500">
                  {formatBytes(uploadLoadedBytes)} / {formatBytes(uploadTotalBytes)}
                </p>
              </div>

              {uploadPhase !== 'processing' ? (
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="shrink-0 rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded bg-gray-200">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            {uploadPhase === 'processing' ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700"></span>
                <span>Uploading videos to cloud and saving…</span>
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-500">
                Please keep this tab open until the update finishes.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default EditCourse
