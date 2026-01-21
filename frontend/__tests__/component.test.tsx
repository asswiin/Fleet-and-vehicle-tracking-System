import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// Simple component for testing
const TestComponent = () => (
  <View testID="test-view">
    <Text testID="test-text">Hello Jest</Text>
  </View>
);

describe('React Native Testing', () => {
  it('should render a component', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('test-view')).toBeTruthy();
  });

  it('should display text content', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('test-text')).toBeTruthy();
    expect(screen.getByText('Hello Jest')).toBeTruthy();
  });
});
