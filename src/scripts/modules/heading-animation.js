export function initHeadingAnimation() {
  const title = document.querySelector('#apply-title')
  const motion = window.gsap
  const scrollTrigger = window.ScrollTrigger
  const splitting = window.Splitting
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  if (!title || !motion || !scrollTrigger || !splitting || reducedMotion.matches) return

  motion.registerPlugin(scrollTrigger)
  splitting({ target: title })

  const chars = title.querySelectorAll('.char')
  if (!chars.length) return

  motion.fromTo(
    chars,
    {
      opacity: 0,
      filter: 'blur(18px)',
    },
    {
      opacity: 1,
      filter: 'blur(0px)',
      duration: 0.6,
      ease: 'power1.out',
      stagger: { each: 0.035, from: 'random' },
      scrollTrigger: {
        trigger: title,
        start: 'top 85%',
        end: 'top 40%',
        toggleActions: 'play none none reset',
      },
    },
  )
}
