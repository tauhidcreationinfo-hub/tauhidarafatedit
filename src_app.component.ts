// Fix: Removed HostListener from imports as it's no longer used as a decorator.
import { ChangeDetectionStrategy, Component, signal, computed, AfterViewInit, OnDestroy, ElementRef, ViewChild, ViewChildren, QueryList, Renderer2, inject, Subscription } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleGenAI, Type, Chat } from '@google/genai';

interface Project {
  title: string;
  category: 'Podcast' | 'Talking Head' | 'Ads' | 'Social Media';
  imageUrl: string;
  duration: string;
  link: string;
}

// Updated interface for the AI Storyboard Assistant
interface StoryboardIdea {
  modelResponseText: string; // AI's text response for the chat
  storyboard: {
    title: string;
    logline: string;
    shotList: {
        shotNumber: number;
        cameraAngle: string;
        description: string;
    }[];
  };
}

// Interface for chat messages
interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}


declare var VANTA: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  // Fix: Moved HostListener logic into the `host` property for better practice.
  host: {
    '(window:scroll)': 'onWindowScroll()',
  }
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('vantaContainer') vantaContainer!: ElementRef;
  private vantaEffect: any;

  // For hero scroll animations
  @ViewChild('heroBadge') heroBadge!: ElementRef;
  @ViewChild('heroTitle') heroTitle!: ElementRef;
  @ViewChild('heroParagraph') heroParagraph!: ElementRef;
  @ViewChild('heroWorkButton') heroWorkButton!: ElementRef;
  @ViewChild('heroContactButton') heroContactButton!: ElementRef;

  // For AI chat scroll
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  // For reliable project animation
  @ViewChildren('projectCard', { read: ElementRef }) projectCards!: QueryList<ElementRef>;
  private projectCardsSub?: Subscription;


  private renderer = inject(Renderer2);
  private elRef = inject(ElementRef);
  private scrollObserver?: IntersectionObserver;


  mobileMenuOpen = signal(false);

  navLinks = signal([
    { label: 'Services', sectionId: 'services' },
    { label: 'Projects', sectionId: 'projects' },
    { label: 'AI Assistant', sectionId: 'ai-assistant' },
    { label: 'Contact', sectionId: 'contact' },
  ]);

  stats = signal([
    { value: '100+', label: 'Projects Completed' },
    { value: '50+', label: 'Happy Clients' },
    { value: '4+', label: 'Years of Experience' },
  ]);

  services = signal([
    {
      icon: 'design',
      title: 'Post-Production & Editing',
      description: 'Crafting compelling narratives through precise cuts, pacing, sound design, and storytelling.',
      features: ['Short Films & Features', 'YouTube & Social Media', 'Corporate & Commercials', 'Music Videos']
    },
    {
      icon: 'code',
      title: 'Motion Graphics & VFX',
      description: 'Bringing concepts to life with dynamic animations, engaging titles, and seamless visual effects.',
      features: ['2D/3D Logo Animation', 'Explainer Videos', 'Title Sequences', 'VFX Compositing']
    },
    {
      icon: 'commerce',
      title: 'Color Correction & Grading',
      description: 'Enhancing mood and visual appeal with professional color science to create a stunning cinematic look.',
      features: ['Cinematic Color Grading', 'Shot Matching & Consistency', 'Look Development', 'HDR & RAW Workflows']
    }
  ]);

  projects = signal<Project[]>([
    { title: 'Starlight Soda Campaign', category: 'Ads', imageUrl: 'https://picsum.photos/seed/innovate/600/400', duration: '45 Seconds', link: '#' },
    { title: 'Tech Breakdown', category: 'Talking Head', imageUrl: 'https://picsum.photos/seed/lens/600/400', duration: 'Weekly Show', link: '#' },
    { title: 'Viral Velocity Reels', category: 'Social Media', imageUrl: 'https://picsum.photos/seed/quantum/600/400', duration: 'Campaign', link: '#' },
    { title: 'The Ascent: Brand Film', category: 'Ads', imageUrl: 'https://picsum.photos/seed/health/600/400', duration: '3 Minutes', link: '#' },
    { title: 'Mindset Mastery Podcast', category: 'Podcast', imageUrl: 'https://picsum.photos/seed/artisan/600/400', duration: 'Series', link: '#' },
    { title: 'The Digital Frontier', category: 'Podcast', imageUrl: 'https://picsum.photos/seed/nexus/600/400', duration: 'Series', link: '#' }
  ]);

  projectCategories = computed(() => {
    const categories = this.projects().map(p => p.category);
    return ['All', 'Podcast', 'Talking Head', 'Ads', 'Social Media'];
  });

  selectedCategory = signal<string>('All');

  filteredProjects = computed(() => {
    const category = this.selectedCategory();
    if (category === 'All') {
      return this.projects();
    }
    return this.projects().filter(p => p.category === category);
  });

  // AI Assistant State (Chat-based)
  aiPrompt = signal('');
  aiStoryboard = signal<StoryboardIdea | null>(null);
  aiLoading = signal(false);
  aiError = signal<string | null>(null);
  chatHistory = signal<ChatMessage[]>([]);
  private chat?: Chat;


  // Contact Form State
  formState = signal<'idle' | 'submitting' | 'success' | 'error'>('idle');
  formMessage = signal('');

  // Fix: Removed @HostListener decorator. The logic is now in the `host` property of @Component.
  onWindowScroll(): void {
    if (!this.heroBadge || !this.heroTitle || !this.heroParagraph || !this.heroWorkButton || !this.heroContactButton) {
      return;
    }

    const elements = {
      badge: this.heroBadge.nativeElement,
      title: this.heroTitle.nativeElement,
      paragraph: this.heroParagraph.nativeElement,
      workButton: this.heroWorkButton.nativeElement,
      contactButton: this.heroContactButton.nativeElement,
    };

    const scrollY = window.scrollY;

    if (scrollY <= 1) {
      // AT TOP: Restore float animation, remove scroll animation styles.
      this.renderer.removeStyle(elements.badge, 'opacity');
      this.renderer.removeStyle(elements.badge, 'transform');
      this.renderer.removeStyle(elements.title, 'opacity');
      this.renderer.removeStyle(elements.title, 'transform');
      this.renderer.removeStyle(elements.paragraph, 'opacity');
      this.renderer.removeStyle(elements.paragraph, 'transform');
      this.renderer.removeStyle(elements.workButton, 'opacity');
      this.renderer.removeStyle(elements.workButton, 'transform');
      this.renderer.removeStyle(elements.contactButton, 'opacity');
      this.renderer.removeStyle(elements.contactButton, 'transform');
      
      // Add float animation class to buttons
      this.renderer.addClass(elements.workButton, 'animate-gentle-float');
      this.renderer.addClass(elements.contactButton, 'animate-gentle-float');

    } else {
      // SCROLLING: Remove float animation, apply scroll animation styles.
      
      // Remove float class from buttons to prevent conflict
      this.renderer.removeClass(elements.workButton, 'animate-gentle-float');
      this.renderer.removeClass(elements.contactButton, 'animate-gentle-float');
      
      const animationEndScroll = window.innerHeight * 0.6;
      const scrollProgress = Math.min(1, scrollY / animationEndScroll);
      const opacity = 1 - scrollProgress;

      const upwardTranslate = -scrollProgress * 200;
      const backwardTranslate = -scrollProgress * 400;
      const mainRotateX = scrollProgress * 80;
      const swingRotateY = scrollProgress * 100;

      // Apply styles to all elements
      const badgeTransform = `translateY(${upwardTranslate}px) translateZ(${backwardTranslate * 0.8}px) rotateX(${mainRotateX}deg)`;
      this.renderer.setStyle(elements.badge, 'opacity', opacity);
      this.renderer.setStyle(elements.badge, 'transform', badgeTransform);
    
      const paragraphTransform = `translateY(${upwardTranslate * 1.1}px) translateZ(${backwardTranslate * 0.9}px) rotateX(${mainRotateX * 0.9}deg)`;
      this.renderer.setStyle(elements.paragraph, 'opacity', opacity);
      this.renderer.setStyle(elements.paragraph, 'transform', paragraphTransform);

      const titleTransform = `translateY(${upwardTranslate}px) translateZ(${backwardTranslate}px) rotateX(${mainRotateX}deg)`;
      this.renderer.setStyle(elements.title, 'opacity', opacity);
      this.renderer.setStyle(elements.title, 'transform', titleTransform);

      const workButtonTransform = `translateZ(${backwardTranslate}px) rotateY(${swingRotateY}deg)`;
      this.renderer.setStyle(elements.workButton, 'opacity', opacity);
      this.renderer.setStyle(elements.workButton, 'transform', workButtonTransform);

      const contactButtonTransform = `translateZ(${backwardTranslate}px) rotateY(-${swingRotateY}deg)`;
      this.renderer.setStyle(elements.contactButton, 'opacity', opacity);
      this.renderer.setStyle(elements.contactButton, 'transform', contactButtonTransform);
    }
  }

  ngAfterViewInit(): void {
    if (typeof VANTA !== 'undefined') {
      this.vantaEffect = VANTA.NET({
        el: this.vantaContainer.nativeElement,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        color: 0x2563eb, // tailwind blue-600
        backgroundColor: 0x20617, // tailwind slate-950
        points: 12.00,
        maxDistance: 20.00,
        spacing: 15.00
      });
    }
    // Set transform origin for better 3D rotation on hero elements
    if (this.heroTitle) {
      this.renderer.setStyle(this.heroTitle.nativeElement, 'transform-origin', 'center bottom');
    }
    if (this.heroWorkButton) {
      // Swings left, so pivot is on the right
      this.renderer.setStyle(this.heroWorkButton.nativeElement, 'transform-origin', 'right center');
      this.renderer.addClass(this.heroWorkButton.nativeElement, 'animate-gentle-float');
    }
    if (this.heroContactButton) {
      // Swings right, so pivot is on the left
      this.renderer.setStyle(this.heroContactButton.nativeElement, 'transform-origin', 'left center');
      this.renderer.addClass(this.heroContactButton.nativeElement, 'animate-gentle-float');
      // Add a delay to desynchronize the animation from the other button
      this.renderer.setStyle(this.heroContactButton.nativeElement, 'animation-delay', '-1.5s');
    }
    this.setupScrollObserver();

    // Subscribe to project card changes to re-run the observer setup reliably.
    this.projectCardsSub = this.projectCards.changes.subscribe(() => {
      this.setupScrollObserver();
    });
  }

  ngOnDestroy(): void {
    if (this.vantaEffect) {
      this.vantaEffect.destroy();
    }
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }
    this.projectCardsSub?.unsubscribe();
  }

  private setupScrollObserver(): void {
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }

    const elementsToAnimate = this.elRef.nativeElement.querySelectorAll('.scroll-animate');
    
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.2, // Increased threshold for a smoother perceived entry
    };

    this.scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.renderer.addClass(entry.target, 'is-visible');
        } else {
          // Reversing the animation is now handled by removing the class
          // which triggers the CSS transition back to the base state.
          this.renderer.removeClass(entry.target, 'is-visible');
        }
      });
    }, options);

    elementsToAnimate.forEach((el: Element) => this.scrollObserver!.observe(el));
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(value => !value);

    if (this.mobileMenuOpen()) {
      // Menu is opening
      this.renderer.addClass(document.body, 'overflow-hidden');
    } else {
      // Menu is closing
      this.renderer.removeClass(document.body, 'overflow-hidden');
    }
  }

  filterProjects(category: string): void {
    if (this.selectedCategory() === category) {
      return;
    }
    this.selectedCategory.set(category);

    // The QueryList.changes subscription now handles re-running the observer setup.
    // No need to call it here.

    if(this.mobileMenuOpen()){
        this.toggleMobileMenu();
    }
  }
  
  onFilterClick(event: MouseEvent, category: string): void {
    this.filterProjects(category);
    this.applyRipple(event);
  }

  public applyRipple(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;

    if (target.hasAttribute('disabled')) {
      return;
    }

    const circle = this.renderer.createElement('span');
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;

    this.renderer.setStyle(circle, 'width', `${diameter}px`);
    this.renderer.setStyle(circle, 'height', `${diameter}px`);
    const rect = target.getBoundingClientRect();
    this.renderer.setStyle(circle, 'left', `${event.clientX - rect.left - radius}px`);
    this.renderer.setStyle(circle, 'top', `${event.clientY - rect.top - radius}px`);
    this.renderer.addClass(circle, 'ripple-effect');

    this.renderer.appendChild(target, circle);

    // Clean up the ripple element
    setTimeout(() => {
      if (circle.parentElement) {
        this.renderer.removeChild(target, circle);
      }
    }, 600); // Match animation duration in CSS
  }

  scrollTo(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if(this.mobileMenuOpen()){
        this.toggleMobileMenu();
    }
  }

  updateAiPrompt(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.aiPrompt.set(input.value);
  }

  private getStoryboardSchema(): any {
    return {
      type: Type.OBJECT,
      properties: {
        modelResponseText: { type: Type.STRING, description: 'A short, friendly, conversational response to the user, explaining the storyboard concept you created.' },
        storyboard: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'A creative and catchy title for the video project.' },
            logline: { type: Type.STRING, description: 'A one-sentence summary of the video\'s concept or story.' },
            shotList: {
              type: Type.ARRAY,
              description: 'A list of 3-4 key shots that outline the visual story.',
              items: {
                type: Type.OBJECT,
                properties: {
                  shotNumber: { type: Type.INTEGER, description: 'The sequential number of the shot (1, 2, 3, etc.).' },
                  cameraAngle: { type: Type.STRING, description: 'A brief description of the camera angle or shot type (e.g., "Wide Shot," "Close-up," "Drone Shot").' },
                  description: { type: Type.STRING, description: 'A description of the action or visuals in the shot.' }
                },
                required: ['shotNumber', 'cameraAngle', 'description']
              }
            }
          },
          required: ['title', 'logline', 'shotList']
        }
      },
      required: ['modelResponseText', 'storyboard']
    };
  }

  async sendChatMessage(): Promise<void> {
    const userPrompt = this.aiPrompt().trim();
    if (!userPrompt || this.aiLoading()) {
      return;
    }

    this.aiLoading.set(true);
    this.aiError.set(null);
    this.chatHistory.update(history => [...history, { role: 'user', text: userPrompt }]);
    this.aiPrompt.set('');
    this.scrollToBottom();

    try {
      if (typeof process === 'undefined') {
        throw new Error('AI Assistant is not configured for this hosting environment.');
      }
      
      if (!process.env.API_KEY) {
        throw new Error('API_KEY environment variable not set.');
      }
      
      if (!this.chat) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const systemInstruction = "You are an AI Storyboard Assistant for a video editor. Your goal is to help the user brainstorm video concepts. Based on the user's prompt, you must ALWAYS respond with a valid JSON object that conforms to the provided storyboard schema. For follow-up requests, modify the previous JSON and return the complete, updated JSON object. Your text response should be friendly and explain the concept you came up with.";
        this.chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: { systemInstruction }
        });
      }

      const response = await this.chat.sendMessage({
        message: userPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: this.getStoryboardSchema(),
        },
      });

      const jsonString = response.text;
      const parsedResponse: StoryboardIdea = JSON.parse(jsonString);
      
      this.aiStoryboard.set(parsedResponse);
      this.chatHistory.update(history => [...history, { role: 'model', text: parsedResponse.modelResponseText }]);
      this.scrollToBottom();

    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message || 'Sorry, I encountered an error. Please try rephrasing your request.';
      this.aiError.set(errorMessage);
      this.chatHistory.update(history => [...history, { role: 'model', text: errorMessage }]);
      this.scrollToBottom();
    } finally {
      this.aiLoading.set(false);
    }
  }
  
  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }, 0);
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }

  async handleContactSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const formValues = Object.fromEntries(formData.entries());

    if (!formValues.name || !formValues.email || !formValues.message) {
      this.formState.set('error');
      this.formMessage.set('Please fill out all fields.');
      return;
    }

    this.formState.set('submitting');
    this.formMessage.set('');

    try {
      const response = await fetch('https://formspree.io/f/mldopzbr', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        this.formState.set('success');
        form.reset();
      } else {
        const data = await response.json();
        if (Object.prototype.hasOwnProperty.call(data, 'errors')) {
          this.formMessage.set(data.errors.map((error: { message: string }) => error.message).join(", "));
        } else {
          this.formMessage.set('Sorry, there was a problem sending your message.');
        }
        this.formState.set('error');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.formMessage.set('An unexpected error occurred. Please try again later.');
      this.formState.set('error');
    }
  }
}