import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgxsModule } from '@ngxs/store';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { TopicsComponent } from './topics.component';
import { AiContentService, TopicTaxonomy } from '@app/services/ai-content.service';
import { TranslatePipe } from '@app/pipes/translate.pipe';

describe('TopicsComponent', () => {
  let component: TopicsComponent;
  let fixture: ComponentFixture<TopicsComponent>;

  const mockTopics: TopicTaxonomy = {
    theology: {
      tawhid: { count: 5, paths: ['/books/al-kafi:1:1:1:1'] },
      divine_attributes: { count: 3, paths: ['/books/al-kafi:1:1:1:2'] },
    },
    ethics: {
      patience: { count: 2, paths: ['/books/al-kafi:1:2:1:1'] },
    },
  };

  beforeEach(async () => {
    const aiContentSpy = jasmine.createSpyObj('AiContentService', ['getTopics']);
    aiContentSpy.getTopics.and.returnValue(of(mockTopics));

    await TestBed.configureTestingModule({
      declarations: [TopicsComponent, TranslatePipe],
      imports: [
        NgxsModule.forRoot([]),
        FormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AiContentService, useValue: aiContentSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopicsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to books tab', () => {
    expect(component.activeTab).toBe('books');
  });

  it('should switch tabs', () => {
    component.setActiveTab('ai-topics');
    expect(component.activeTab).toBe('ai-topics');
  });

  it('should load AI topic categories', () => {
    expect(component.aiTopicsAvailable).toBe(true);
    expect(component.aiTopicsLoading).toBe(false);
    expect(component.aiTopicCategories.length).toBe(2);
  });

  it('should sort AI categories by total count descending', () => {
    expect(component.aiTopicCategories[0].key).toBe('theology');
    expect(component.aiTopicCategories[0].totalCount).toBe(8);
    expect(component.aiTopicCategories[1].key).toBe('ethics');
    expect(component.aiTopicCategories[1].totalCount).toBe(2);
  });

  it('should toggle AI category expansion', () => {
    const cat = component.aiTopicCategories[0];
    expect(cat.expanded).toBe(false);
    component.toggleAiCategory(cat);
    expect(cat.expanded).toBe(true);
    component.toggleAiCategory(cat);
    expect(cat.expanded).toBe(false);
  });

  it('should filter AI topics', () => {
    component.filterAiTopics('patience');
    expect(component.filteredAiCategories.length).toBe(1);
    expect(component.filteredAiCategories[0].key).toBe('ethics');
  });

  it('should show all AI topics when filter cleared', () => {
    component.filterAiTopics('patience');
    component.filterAiTopics('');
    expect(component.filteredAiCategories.length).toBe(2);
  });

  it('should format labels', () => {
    expect(component.formatLabel('divine_attributes')).toBe('Divine Attributes');
  });
});

describe('TopicsComponent (no AI data)', () => {
  let component: TopicsComponent;
  let fixture: ComponentFixture<TopicsComponent>;

  beforeEach(async () => {
    const aiContentSpy = jasmine.createSpyObj('AiContentService', ['getTopics']);
    aiContentSpy.getTopics.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      declarations: [TopicsComponent, TranslatePipe],
      imports: [
        NgxsModule.forRoot([]),
        FormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AiContentService, useValue: aiContentSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopicsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show coming-soon when AI topics unavailable', () => {
    expect(component.aiTopicsAvailable).toBe(false);
    expect(component.aiTopicsLoading).toBe(false);
  });
});
