import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SubcategorySwipeBar from './SubcategorySwipeBar';

describe('SubcategorySwipeBar Component', () => {
  const sampleSubCategories = [
    'all',
    'Biscuits & Cookies',
    'Cold Drinks & Juices',
    'Cooking Oil & Ghee',
    'Dal & Pulses',
    'Flour & Atta',
    'Rice & Grains',
    'Spices & Masala',
    'Tea & Coffee'
  ];

  it('renders all subcategories with icons and count badge', () => {
    render(
      <SubcategorySwipeBar
        subCategories={sampleSubCategories}
        selectedSubCategory="all"
        onSelectSubCategory={vi.fn()}
      />
    );

    expect(screen.getByText(/Subcategories:/i)).toBeInTheDocument();
    expect(screen.getByText(/8 available/i)).toBeInTheDocument();
    expect(screen.getByText(/All Subcategories/i)).toBeInTheDocument();
    expect(screen.getByText(/Biscuits & Cookies/i)).toBeInTheDocument();
    expect(screen.getByText(/Cooking Oil & Ghee/i)).toBeInTheDocument();
    expect(screen.getByText(/Rice & Grains/i)).toBeInTheDocument();
  });

  it('invokes onSelectSubCategory when a subcategory pill is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <SubcategorySwipeBar
        subCategories={sampleSubCategories}
        selectedSubCategory="all"
        onSelectSubCategory={handleSelect}
      />
    );

    const riceBtn = screen.getByText(/Rice & Grains/i).closest('button');
    fireEvent.click(riceBtn);

    expect(handleSelect).toHaveBeenCalledWith('Rice & Grains');
  });

  it('highlights the currently selected subcategory', () => {
    render(
      <SubcategorySwipeBar
        subCategories={sampleSubCategories}
        selectedSubCategory="Rice & Grains"
        onSelectSubCategory={vi.fn()}
        colorScheme="emerald"
      />
    );

    const riceBtn = screen.getByText(/Rice & Grains/i).closest('button');
    expect(riceBtn.className).toContain('bg-emerald-600');
  });

  it('returns null if there are 1 or fewer subcategories', () => {
    const { container } = render(
      <SubcategorySwipeBar
        subCategories={['all']}
        selectedSubCategory="all"
        onSelectSubCategory={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
